import { type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { setUserSession } from '@/lib/auth'

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Request body tidak valid' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { email, password } = parsed.data

  const account = await prisma.account.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, passwordHash: true, status: true },
  })

  // Always run bcrypt compare to prevent timing attacks
  const dummyHash = '$2b$12$dummy.hash.to.prevent.timing.attack.XXXXXXXXXXXXX'
  const hashToCheck = account?.passwordHash ?? dummyHash
  const passwordMatch = await bcrypt.compare(password, hashToCheck)

  if (!account || !passwordMatch) {
    return Response.json(
      { error: 'Email atau password salah', code: 'INVALID_CREDENTIALS' },
      { status: 401 }
    )
  }

  if (account.status === 'PENDING_ACTIVATION') {
    return Response.json(
      {
        error: 'Akun belum diaktifkan. Cek email untuk link aktivasi.',
        code: 'ACCOUNT_NOT_ACTIVATED',
      },
      { status: 403 }
    )
  }

  if (account.status === 'DISABLED') {
    return Response.json(
      { error: 'Akun Anda telah dinonaktifkan.', code: 'ACCOUNT_DISABLED' },
      { status: 403 }
    )
  }

  await setUserSession(account.id, account.email)

  return Response.json({ message: 'Login berhasil', role: 'user', email: account.email })
}
