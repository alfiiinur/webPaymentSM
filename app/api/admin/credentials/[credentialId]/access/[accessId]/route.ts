import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ credentialId: string; accessId: string }> }

const patchSchema = z.object({
  hasWarranty: z.boolean(),
})

/**
 * PATCH /api/admin/credentials/[credentialId]/access/[accessId]
 *
 * Toggle garansi untuk satu slot user (ProductAccess).
 * Admin menentukan per-user siapa yang berhak klaim garansi.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { credentialId, accessId } = await params

  let body: unknown
  try { body = await request.json() }
  catch { return Response.json({ error: 'Request body tidak valid' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  // Pastikan ProductAccess ini memang milik credential yang dimaksud
  const access = await prisma.productAccess.findFirst({
    where: { id: accessId, credentialId },
    select: { id: true, hasWarranty: true, account: { select: { email: true } } },
  })

  if (!access) {
    return Response.json(
      { error: 'Akses tidak ditemukan atau tidak cocok dengan credential ini', code: 'NOT_FOUND' },
      { status: 404 },
    )
  }

  const updated = await prisma.productAccess.update({
    where: { id: accessId },
    data: { hasWarranty: parsed.data.hasWarranty },
    select: { id: true, hasWarranty: true, account: { select: { email: true } } },
  })

  return Response.json({
    message: `Garansi ${updated.hasWarranty ? 'diaktifkan' : 'dinonaktifkan'} untuk ${updated.account.email}`,
    productAccess: updated,
  })
}
