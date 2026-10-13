import { type NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/activation'

const activateSchema = z
  .object({
    token: z.string().min(1, 'Token wajib diisi'),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .max(72, 'Password terlalu panjang'), // bcrypt max 72 bytes
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password dan konfirmasi password tidak sama',
    path: ['confirmPassword'],
  })

// POST /api/activate
export async function POST(request: NextRequest) {
  // 1. Parse & validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Request body tidak valid', code: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = activateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      {
        error: 'Validasi gagal',
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const { token, password } = parsed.data

  // 2. Hash the incoming token to look up in DB
  const hashedToken = hashToken(token)

  // 3. Find account with matching token that hasn't expired
  const account = await prisma.account.findFirst({
    where: {
      activationTokenHash: hashedToken,
      activationExpiresAt: { gt: new Date() },
      status: 'PENDING_ACTIVATION',
    },
    select: { id: true, email: true },
  })

  if (!account) {
    return Response.json(
      {
        error: 'Link aktivasi tidak valid atau sudah kadaluarsa',
        code: 'INVALID_TOKEN',
      },
      { status: 400 }
    )
  }

  // 4. Hash password with bcrypt (cost factor 12)
  const passwordHash = await bcrypt.hash(password, 12)

  // 5. Activate account — clear token fields, set password, set status ACTIVE
  await prisma.account.update({
    where: { id: account.id },
    data: {
      passwordHash,
      status: 'ACTIVE',
      activationTokenHash: null,
      activationExpiresAt: null,
    },
  })

  // 6. Clear raw activation token from Order (no longer needed)
  await prisma.order.updateMany({
    where: {
      customerEmail: account.email,
      activationToken: { not: null },
    },
    data: { activationToken: null },
  })

  return Response.json({
    message: 'Akun berhasil diaktifkan',
    email: account.email,
  })
}
