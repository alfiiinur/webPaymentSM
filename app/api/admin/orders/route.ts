import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// ── GET /api/admin/orders — list all orders with filters ──────────────────────
// Extra filter: noCredential=true → hanya PAID orders yang productAccess.credentialId = null
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const storeId = searchParams.get("storeId");
  const email = searchParams.get("email");
  const noCredential = searchParams.get("noCredential") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)),
  );

  const where = {
    ...(status ? { status: status as never } : {}),
    // noCredential implies status=PAID — find PAID orders where productAccess has no credential
    ...(noCredential
      ? {
          status: "PAID" as never,
          productAccess: { some: { credentialId: null } },
        }
      : {}),
    ...(storeId ? { storeId } : {}),
    ...(email
      ? {
          customerEmail: {
            contains: email.toLowerCase(),
            mode: "insensitive" as const,
          },
        }
      : {}),
  };

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, packageType: true } },
        store: { select: { id: true, name: true } },
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
            paidAt: true,
            paymentMethod: true,
          },
        },
        // Sertakan productAccess agar client bisa tahu apakah credential sudah di-assign
        productAccess: {
          select: {
            id: true,
            credentialId: true,
            credential: { select: { id: true, email: true, status: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return Response.json({
    orders,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}
