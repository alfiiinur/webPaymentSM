import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Middleware already guards /api/admin/* — no auth check needed here.

const storeSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung'),
})

// ── GET /api/admin/stores — list all stores with product count ─────────────────
export async function GET() {
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { products: true, orders: true } },
    },
  })

  return Response.json({ stores })
}

// ── POST /api/admin/stores — create a new store ────────────────────────────────
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Request body tidak valid' }, { status: 400 })
  }

  const parsed = storeSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { name, slug } = parsed.data

  const existing = await prisma.store.findUnique({ where: { slug } })
  if (existing) {
    return Response.json({ error: 'Slug sudah digunakan', code: 'SLUG_TAKEN' }, { status: 409 })
  }

  const store = await prisma.store.create({ data: { name, slug } })

  return Response.json({ store }, { status: 201 })
}
