import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung')
    .optional(),
})

type Params = { params: Promise<{ storeId: string }> }

// ── GET /api/admin/stores/[storeId] — detail store ────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { storeId } = await params

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      products: { orderBy: { createdAt: 'desc' } },
      _count: { select: { orders: true } },
    },
  })

  if (!store) {
    return Response.json({ error: 'Store tidak ditemukan', code: 'NOT_FOUND' }, { status: 404 })
  }

  return Response.json({ store })
}

// ── PATCH /api/admin/stores/[storeId] — update store ──────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const { storeId } = await params

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

  const { name, slug } = parsed.data

  if (slug) {
    const conflict = await prisma.store.findFirst({
      where: { slug, NOT: { id: storeId } },
    })
    if (conflict) {
      return Response.json({ error: 'Slug sudah digunakan', code: 'SLUG_TAKEN' }, { status: 409 })
    }
  }

  const store = await prisma.store.update({
    where: { id: storeId },
    data: { ...(name && { name }), ...(slug && { slug }) },
  })

  return Response.json({ store })
}

// ── DELETE /api/admin/stores/[storeId] — delete store ────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { storeId } = await params

  const productCount = await prisma.product.count({ where: { storeId } })
  if (productCount > 0) {
    return Response.json(
      {
        error: `Tidak bisa hapus store yang masih punya ${productCount} produk. Hapus produk dulu.`,
        code: 'HAS_PRODUCTS',
      },
      { status: 409 }
    )
  }

  await prisma.store.delete({ where: { id: storeId } })

  return Response.json({ message: 'Store berhasil dihapus' })
}
