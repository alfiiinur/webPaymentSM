import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  email: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  notes: z.string().max(500).nullable().optional(),
  status: z.enum(["AVAILABLE", "USED", "INACTIVE"]).optional(),
  maxSlots: z.number().int().min(1).max(10).optional(),
  hasWarranty: z.boolean().optional(),
});

type Params = { params: Promise<{ credentialId: string }> };

// ── GET /api/admin/credentials/[credentialId] ─────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { credentialId } = await params;

  const credential = await prisma.productCredential.findUnique({
    where: { id: credentialId },
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
          account: { select: { id: true, email: true, status: true } },
          order: {
            select: { orderNumber: true, status: true, createdAt: true },
          },
        },
      },
    },
  });

  if (!credential) {
    return Response.json(
      { error: "Credential tidak ditemukan", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  return Response.json({ credential });
}

// ── PATCH /api/admin/credentials/[credentialId] ───────────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const { credentialId } = await params;

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

  const credential = await prisma.productCredential.update({
    where: { id: credentialId },
    data: parsed.data,
    include: {
      product: { select: { id: true, name: true, packageType: true } },
    },
  });

  return Response.json({ credential });
}

// ── DELETE /api/admin/credentials/[credentialId] ──────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { credentialId } = await params;

  // Jika sudah di-assign ke user, jangan hapus — nonaktifkan saja
  const cred = await prisma.productCredential.findUnique({
    where: { id: credentialId },
    select: { status: true, productAccess: { select: { id: true }, take: 1 } },
  });

  if (!cred) {
    return Response.json(
      { error: "Credential tidak ditemukan" },
      { status: 404 },
    );
  }

  if (cred.productAccess.length > 0) {
    // Sudah dipakai — nonaktifkan saja
    const credential = await prisma.productCredential.update({
      where: { id: credentialId },
      data: { status: "INACTIVE" },
    });
    return Response.json({
      message:
        "Credential dinonaktifkan (sudah di-assign ke user, tidak bisa dihapus permanen)",
      credential,
    });
  }

  await prisma.productCredential.delete({ where: { id: credentialId } });
  return Response.json({ message: "Credential berhasil dihapus" });
}
