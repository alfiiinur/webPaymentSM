import { prisma } from '@/lib/prisma'
import ProductsClient from './products-client'

export default async function AdminProductsPage() {
  const [products, stores] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        store: { select: { id: true, name: true } },
        _count: { select: { orders: true, productAccess: true } },
      },
    }),
    prisma.store.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  return <ProductsClient initialProducts={products} stores={stores} />
}
