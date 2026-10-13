import { prisma } from '@/lib/prisma'
import StoresClient from './stores-client'

export default async function AdminStoresPage() {
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { products: true, orders: true } } },
  })

  return <StoresClient initialStores={stores} />
}
