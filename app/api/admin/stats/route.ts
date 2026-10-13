import { prisma } from '@/lib/prisma'

// ── GET /api/admin/stats — dashboard summary ──────────────────────────────────
export async function GET() {
  const [
    totalStores,
    totalProducts,
    activeProducts,
    totalOrders,
    paidOrders,
    pendingOrders,
    totalAccounts,
    activeAccounts,
    pendingAccounts,
    revenueResult,
  ] = await prisma.$transaction([
    prisma.store.count(),
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PAID' } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.account.count(),
    prisma.account.count({ where: { status: 'ACTIVE' } }),
    prisma.account.count({ where: { status: 'PENDING_ACTIVATION' } }),
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
  ])

  return Response.json({
    stores:   { total: totalStores },
    products: { total: totalProducts, active: activeProducts },
    orders:   { total: totalOrders, paid: paidOrders, pending: pendingOrders },
    accounts: { total: totalAccounts, active: activeAccounts, pending: pendingAccounts },
    revenue:  { total: revenueResult._sum.amount ?? 0 },
  })
}
