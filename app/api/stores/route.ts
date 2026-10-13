import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const q = searchParams.get('q') ?? ''

  try {
    const stores = await prisma.store.findMany({
      where: q
        ? { name: { contains: q, mode: 'insensitive' } }
        : undefined,
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { name: 'asc' },
    })

    return Response.json({ stores })
  } catch {
    return Response.json(
      { error: 'Failed to fetch stores', code: 'FETCH_ERROR' },
      { status: 500 }
    )
  }
}
