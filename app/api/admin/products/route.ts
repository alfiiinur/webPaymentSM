import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const productSchema = z.object({
  storeId: z.string().min(1, 'Store ID wajib diisi'),
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  packageType: z.string().min(1, 'Tipe paket wajib diisi').max(50),
  duration: z.number().int().positive('Durasi harus bilangan positif'),
  durationUnit: z.string().min(1).max(20),
  price: z.number().int().positive('Harga harus bilangan positif'),
  isActive: z.boolean().default(true),
})

// ── GET /api/admin/products — list all products ────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const storeId  = searchParams.get('storeId')
  const isActive = searchParams.get('isActive')

  const products = await prisma.product.findMany({
    where: {
      ...(storeId  ? { storeId }  : {}),
      ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
    },
    include: {
      store: { select: { id: true, name: true, slug: true } },
      _count: { select: { orders: true, productAccess: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json({ products })
}

// ── POST /api/admin/products — create a new product ───────────────────────────
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Request body tidak valid' }, { status: 400 })
  }

  const parsed = productSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { storeId, name, packageType, duration, durationUnit, price, isActive } = parsed.data

  const store = await prisma.store.findUnique({ where: { id: storeId } })
  if (!store) {
    return Response.json({ error: 'Store tidak ditemukan', code: 'STORE_NOT_FOUND' }, { status: 404 })
  }

  const product = await prisma.product.create({
    data: { storeId, name, packageType, duration, durationUnit, price, isActive },
    include: { store: { select: { id: true, name: true } } },
  })

  return Response.json({ product }, { status: 201 })
}
