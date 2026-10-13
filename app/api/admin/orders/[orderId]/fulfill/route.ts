import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fulfillOrder } from '@/lib/fulfillment'

type Params = { params: Promise<{ orderId: string }> }

/**
 * POST /api/admin/orders/[orderId]/fulfill
 *
 * Memicu ulang fulfillment untuk order yang sudah PAID tapi belum mendapat
 * credential (misalnya karena stok habis saat webhook diproses).
 *
 * Idempotent — aman dipanggil berkali-kali karena fulfillOrder sudah idempotent.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const { orderId } = await params

  // Pastikan order valid dan statusnya PAID
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      orderNumber: true,
      productId: true,
      productAccess: {
        select: { id: true, credentialId: true },
      },
    },
  })

  if (!order) {
    return Response.json({ error: 'Order tidak ditemukan', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (order.status !== 'PAID') {
    return Response.json(
      { error: `Order belum PAID (status: ${order.status})`, code: 'NOT_PAID' },
      { status: 400 },
    )
  }

  // Cek apakah memang belum punya credential
  const alreadyFulfilled = order.productAccess.every((pa) => pa.credentialId !== null)
  if (alreadyFulfilled && order.productAccess.length > 0) {
    return Response.json(
      { message: 'Order sudah memiliki credential', alreadyFulfilled: true },
      { status: 200 },
    )
  }

  // Cek apakah ada credential AVAILABLE untuk produk ini
  const availableCredential = await prisma.productCredential.findFirst({
    where: { productId: order.productId, status: 'AVAILABLE' },
    select: { id: true },
  })

  if (!availableCredential) {
    return Response.json(
      {
        error: 'Tidak ada credential tersedia untuk produk ini. Tambahkan credential baru terlebih dahulu.',
        code: 'NO_CREDENTIAL_AVAILABLE',
      },
      { status: 422 },
    )
  }

  // Jalankan fulfillment
  await fulfillOrder(orderId)

  // Kembalikan status terbaru
  const updated = await prisma.productAccess.findFirst({
    where: { orderId },
    select: {
      id: true,
      credentialId: true,
      credential: { select: { id: true, email: true, status: true } },
    },
  })

  const success = updated?.credentialId !== null

  return Response.json({
    message: success
      ? 'Credential berhasil di-assign ke order'
      : 'Fulfillment dijalankan tapi credential belum ter-assign (stok habis)',
    success,
    productAccess: updated,
  })
}
