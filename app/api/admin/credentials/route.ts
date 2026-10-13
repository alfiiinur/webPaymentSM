import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  productId: z.string().min(1, "Product ID wajib diisi"),
  email: z.string().min(1, "Email wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
  notes: z.string().max(500).optional(),
  maxSlots: z.number().int().min(1).max(10).default(1),
});

// ── GET /api/admin/credentials?productId=xxx ──────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const status = searchParams.get("status");

  const credentials = await prisma.productCredential.findMany({
    where: {
      ...(productId ? { productId } : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          packageType: true,
          store: { select: { name: true } },
        },
      },
      productAccess: {
        select: {
          id: true,
          grantedAt: true,
          hasWarranty: true,
          account: { select: { email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ credentials });
}

// ── POST /api/admin/credentials ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body tidak valid" },
      { status: 400 },
    );
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validasi gagal", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { productId, email, password, notes, maxSlots } = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return Response.json(
      { error: "Produk tidak ditemukan", code: "PRODUCT_NOT_FOUND" },
      { status: 404 },
    );
  }

  const credential = await prisma.productCredential.create({
    data: {
      productId,
      email,
      password,
      notes: notes ?? null,
      status: "AVAILABLE",
      maxSlots,
      usedSlots: 0,
    },
    include: {
      product: { select: { id: true, name: true, packageType: true } },
    },
  });

  return Response.json({ credential }, { status: 201 });
}
