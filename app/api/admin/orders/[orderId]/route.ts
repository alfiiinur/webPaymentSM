import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ orderId: string }> }

// ── GET /api/admin/orders/[orderId] — detail order ───────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { orderId } = await params

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      product: true,
      store:   true,
      payment: true,
    },
  })

  if (!order) {
    return Response.json({ error: 'Order tidak ditemukan', code: 'NOT_FOUND' }, { status: 404 })
  }

  // Also fetch account info for this customer
  const account = await prisma.account.findUnique({
    where: { email: order.customerEmail },
    select: { id: true, email: true, status: true, createdAt: true },
  })

  return Response.json({ order, account })
}
