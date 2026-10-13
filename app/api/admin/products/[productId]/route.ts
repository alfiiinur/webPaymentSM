import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  packageType: z.string().min(1).max(50).optional(),
  duration: z.number().int().positive().optional(),
  durationUnit: z.string().min(1).max(20).optional(),
  price: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
})

type Params = { params: Promise<{ productId: string }> }

// ── GET /api/admin/products/[productId] — detail product ──────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { productId } = await params

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      store: { select: { id: true, name: true, slug: true } },
      _count: { select: { orders: true, productAccess: true } },
    },
  })

  if (!product) {
    return Response.json({ error: 'Produk tidak ditemukan', code: 'NOT_FOUND' }, { status: 404 })
  }

  return Response.json({ product })
}

// ── PATCH /api/admin/products/[productId] — update product ────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const { productId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Request body tidak valid' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: parsed.data,
    include: { store: { select: { id: true, name: true } } },
  })

  return Response.json({ product })
}

// ── DELETE /api/admin/products/[productId] — delete product ──────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { productId } = await params

  // Soft delete: only allow hard delete if no paid orders
  const paidOrderCount = await prisma.order.count({
    where: { productId, status: 'PAID' },
  })

  if (paidOrderCount > 0) {
    // Deactivate instead of hard delete
    const product = await prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    })
    return Response.json({
      message: `Produk dinonaktifkan (ada ${paidOrderCount} order PAID terkait, tidak bisa dihapus permanen)`,
      product,
    })
  }

  await prisma.product.delete({ where: { id: productId } })

  return Response.json({ message: 'Produk berhasil dihapus' })
}
