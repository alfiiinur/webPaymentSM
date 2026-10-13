import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const paramsSchema = z.object({
  productId: z.string().min(1),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const rawParams = await params
  const parsed = paramsSchema.safeParse(rawParams)

  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid product ID', code: 'INVALID_PARAMS' },
      { status: 400 }
    )
  }

  const { productId } = parsed.data

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
      select: {
        id: true,
        name: true,
        packageType: true,
        duration: true,
        durationUnit: true,
        price: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    if (!product) {
      return Response.json(
        { error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return Response.json({ product })
  } catch {
    return Response.json(
      { error: 'Failed to fetch product', code: 'FETCH_ERROR' },
      { status: 500 }
    )
  }
}
