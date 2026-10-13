import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { clearSession } from '@/lib/auth'

const logoutSchema = z.object({
  role: z.enum(['admin', 'user', 'both']).default('both'),
})

export async function POST(request: NextRequest) {
  let role: 'admin' | 'user' | 'both' = 'both'

  try {
    const body = await request.json()
    const parsed = logoutSchema.safeParse(body)
    if (parsed.success) role = parsed.data.role
  } catch {
    // body is optional — default to clearing both
  }

  await clearSession(role)

  return Response.json({ message: 'Logout berhasil' })
}
