import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { snap } from "@/lib/midtrans";

// ── Zod validation schema ─────────────────────────────────────────────────────

const createOrderSchema = z.object({
  productId: z.string().min(1, "Product ID wajib diisi"),
  customerName: z.string().min(2, "Nama minimal 2 karakter").max(100),
  customerEmail: z.string().email("Format email tidak valid"),
  note: z.string().max(500).optional(),
});

// ── Helper: generate order number ─────────────────────────────────────────────

function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-8); // last 8 digits of timestamp
  const random = Math.floor(Math.random() * 9000 + 1000); // 4 digit random
  return `INV-${timestamp}${random}`;
}

// ── POST /api/orders ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Parse & validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body tidak valid", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Validasi gagal",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { productId, customerName, customerEmail, note } = parsed.data;

  // 2. Fetch product from DB — price comes from here, not from client
  const product = await prisma.product.findUnique({
    where: { id: productId, isActive: true },
    include: { store: true },
  });

  if (!product) {
    return Response.json(
      {
        error: "Produk tidak ditemukan atau tidak aktif",
        code: "PRODUCT_NOT_FOUND",
      },
      { status: 404 },
    );
  }

  const orderNumber = generateOrderNumber();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // 3. Create Order + Payment in a single DB transaction — commits BEFORE Midtrans call
  let order: { id: string; orderNumber: string };
  let payment: { id: string };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          status: "PENDING",
          productId: product.id,
          storeId: product.storeId,
          customerName,
          customerEmail: customerEmail.toLowerCase(),
          note: note ?? null,
        },
        select: { id: true, orderNumber: true },
      });

      const newPayment = await tx.payment.create({
        data: {
          orderId: newOrder.id,
          status: "PENDING",
          amount: product.price,
          paymentMethod: "QRIS",
        },
        select: { id: true },
      });

      return { order: newOrder, payment: newPayment };
    });

    order = result.order;
    payment = result.payment;
  } catch (err) {
    console.error("[CREATE_ORDER] DB transaction failed:", err);
    return Response.json(
      { error: "Gagal membuat order. Silakan coba lagi.", code: "DB_ERROR" },
      { status: 500 },
    );
  }

  // 4. Call Midtrans Snap API — AFTER DB transaction commits
  try {
    const [firstName, ...rest] = customerName.trim().split(" ");

    const snapResponse = await snap.createTransaction({
      transaction_details: {
        order_id: order.orderNumber, // use orderNumber as Midtrans order_id
        gross_amount: product.price,
      },
      item_details: [
        {
          id: product.id,
          price: product.price,
          quantity: 1,
          name: `${product.name} ${product.packageType} ${product.duration} ${product.durationUnit}`,
        },
      ],
      customer_details: {
        first_name: firstName ?? customerName,
        last_name: rest.join(" ") || undefined,
        email: customerEmail.toLowerCase(),
      },
      // enabled_payments: ['qris'], // uncomment after enabling QRIS in Midtrans Sandbox dashboard
      expiry: {
        unit: "hour",
        duration: 24,
      },
      callbacks: {
        finish: `${appUrl}/payment/${order.id}/receipt`,
      },
    });

    // 5. Update Payment with Midtrans response
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        snapToken: snapResponse.token,
        paymentUrl: snapResponse.redirect_url,
        providerPaymentId: order.orderNumber,
      },
    });

    return Response.json(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        snapToken: snapResponse.token,
        paymentUrl: snapResponse.redirect_url,
      },
      { status: 201 },
    );
  } catch (err) {
    // 6. Midtrans failed — mark Order + Payment as FAILED
    console.error("[CREATE_ORDER] Midtrans call failed:", err);

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { status: "FAILED" },
      }),
    ]);

    return Response.json(
      {
        error:
          "Gagal menghubungi payment gateway. Silakan coba beberapa saat lagi.",
        code: "MIDTRANS_ERROR",
      },
      { status: 502 },
    );
  }
}
