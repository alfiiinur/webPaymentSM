import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/orders/[orderId]/status
// Read-only endpoint for frontend polling — never calls Midtrans directly.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params

  if (!orderId) {
    return Response.json(
      { error: 'Order ID wajib diisi', code: 'INVALID_PARAMS' },
      { status: 400 }
    )
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        payment: {
          select: {
            paidAt: true,
            paymentReference: true,
          },
        },
      },
    })

    if (!order) {
      return Response.json(
        { error: 'Order tidak ditemukan', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return Response.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paidAt: order.payment?.paidAt ?? null,
      paymentReference: order.payment?.paymentReference ?? null,
    })
  } catch {
    return Response.json(
      { error: 'Gagal mengambil status order', code: 'FETCH_ERROR' },
      { status: 500 }
    )
  }
}
