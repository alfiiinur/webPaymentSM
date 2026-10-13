import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// ── GET /api/admin/accounts — list all accounts ───────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const email  = searchParams.get('email')
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(email  ? { email: { contains: email.toLowerCase(), mode: 'insensitive' as const } } : {}),
  }

  const [accounts, total] = await prisma.$transaction([
    prisma.account.findMany({
      where,
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { productAccess: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.account.count({ where }),
  ])

  return Response.json({
    accounts,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}
