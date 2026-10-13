import { getUserSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── GET /api/user/me — current user info ──────────────────────────────────────
export async function GET() {
  const session = await getUserSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const account = await prisma.account.findUnique({
    where: { id: session.accountId },
    select: {
      id: true,
      email: true,
      status: true,
      createdAt: true,
    },
  })

  if (!account) {
    return Response.json({ error: 'Akun tidak ditemukan', code: 'NOT_FOUND' }, { status: 404 })
  }

  return Response.json({ account })
}
