import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED", "PENDING_ACTIVATION"]),
});

type Params = { params: Promise<{ accountId: string }> };

// ── GET /api/admin/accounts/[accountId] — detail account ─────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { accountId } = await params;

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      email: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      productAccess: {
        include: {
          product: {
            include: {
              store: { select: { id: true, name: true } },
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              createdAt: true,
              payment: { select: { status: true, amount: true, paidAt: true } },
            },
          },
        },
        orderBy: { grantedAt: "desc" },
      },
    },
  });

  if (!account) {
    return Response.json(
      { error: "Akun tidak ditemukan", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  return Response.json({ account });
}

// ── PATCH /api/admin/accounts/[accountId] — update status ─────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const { accountId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body tidak valid" },
      { status: 400 },
    );
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validasi gagal", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const account = await prisma.account.update({
    where: { id: accountId },
    data: { status: parsed.data.status },
    select: { id: true, email: true, status: true, updatedAt: true },
  });

  return Response.json({ account });
}
