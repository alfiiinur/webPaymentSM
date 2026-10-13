import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const replaceSchema = z.object({
  productAccessId: z.string().min(1, 'ProductAccess ID wajib diisi'),
  newEmail:        z.string().min(1, 'Email baru wajib diisi'),
  newPassword:     z.string().min(1, 'Password baru wajib diisi'),
  newNotes:        z.string().max(500).optional(),
  reason:          z.string().max(200).optional(), // alasan penggantian (log saja)
})

type Params = { params: Promise<{ credentialId: string }> }

/**
 * POST /api/admin/credentials/[credentialId]/replace
 *
 * Mengganti credential yang bermasalah untuk satu ProductAccess user:
 * 1. Validasi ProductAccess & credential lama
 * 2. Buat credential baru (USED, usedSlots=1, maxSlots=sama dengan lama)
 * 3. Update ProductAccess: credentialId → baru, replacedCredentialId → lama, replacedAt → now
 * 4. Kurangi usedSlots credential lama, set status INACTIVE
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { credentialId } = await params

  let body: unknown
  try { body = await request.json() }
  catch { return Response.json({ error: 'Request body tidak valid' }, { status: 400 }) }

  const parsed = replaceSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { productAccessId, newEmail, newPassword, newNotes, reason } = parsed.data

  // 1. Load ProductAccess + old credential
  const productAccess = await prisma.productAccess.findUnique({
    where: { id: productAccessId },
    select: {
      id: true,
      credentialId: true,
      productId: true,
      account: { select: { email: true } },
      credential: { select: { id: true, status: true, usedSlots: true, maxSlots: true, hasWarranty: true } },
    },
  })

  if (!productAccess) {
    return Response.json({ error: 'ProductAccess tidak ditemukan', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (productAccess.credentialId !== credentialId) {
    return Response.json(
      { error: 'ProductAccess tidak menggunakan credential ini', code: 'MISMATCH' },
      { status: 400 }
    )
  }

  const oldCred = productAccess.credential
  if (!oldCred) {
    return Response.json({ error: 'Credential lama tidak ditemukan', code: 'NO_CREDENTIAL' }, { status: 404 })
  }

  // 2. Jalankan dalam satu transaksi
  const result = await prisma.$transaction(async (tx) => {
    // Buat credential baru (langsung USED karena langsung di-assign)
    const newCred = await tx.productCredential.create({
      data: {
        productId:   productAccess.productId,
        email:       newEmail,
        password:    newPassword,
        notes:       newNotes ?? null,
        status:      'USED',
        maxSlots:    oldCred.maxSlots,
        usedSlots:   1,
        hasWarranty: oldCred.hasWarranty, // inherit warranty dari yang lama
        assignedAt:  new Date(),
      },
    })

    // Update ProductAccess: credential baru, simpan lama sebagai riwayat
    await tx.productAccess.update({
      where: { id: productAccessId },
      data: {
        credentialId:        newCred.id,
        replacedCredentialId: credentialId,
        replacedAt:          new Date(),
      },
    })

    // Kurangi usedSlots credential lama, set INACTIVE
    const newUsedSlots = Math.max(0, oldCred.usedSlots - 1)
    await tx.productCredential.update({
      where: { id: credentialId },
      data: {
        usedSlots: newUsedSlots,
        status:    'INACTIVE',
      },
    })

    return { newCredentialId: newCred.id }
  })

  console.log(
    `[REPLACE] Credential ${credentialId} → ${result.newCredentialId} for user ${productAccess.account.email}` +
    (reason ? ` (reason: ${reason})` : '')
  )

  return Response.json({
    message:          'Credential berhasil diganti',
    newCredentialId:  result.newCredentialId,
    userEmail:        productAccess.account.email,
  })
}
