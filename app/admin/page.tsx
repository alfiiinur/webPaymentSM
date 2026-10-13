import { prisma } from '@/lib/prisma'

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

export default async function AdminOverviewPage() {
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
    recentOrders,
  ] = await Promise.all([
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
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        product: { select: { name: true, packageType: true } },
        payment: { select: { status: true, amount: true } },
      },
    }),
  ])

  const revenue = revenueResult._sum.amount ?? 0

  const statCards = [
    { label: 'Total Revenue', value: formatRupiah(revenue), sub: `${paidOrders} order lunas`, color: 'text-green-600 dark:text-green-400' },
    { label: 'Total Store',   value: String(totalStores),   sub: 'store aktif',               color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Produk',        value: String(totalProducts), sub: `${activeProducts} aktif`,   color: 'text-purple-600 dark:text-purple-400' },
    { label: 'Order',         value: String(totalOrders),   sub: `${pendingOrders} pending`,  color: 'text-orange-600 dark:text-orange-400' },
    { label: 'Akun Customer', value: String(totalAccounts), sub: `${activeAccounts} aktif · ${pendingAccounts} pending`, color: 'text-indigo-600 dark:text-indigo-400' },
  ]

  const statusBadge: Record<string, string> = {
    PAID:      'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
    PENDING:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    FAILED:    'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
    EXPIRED:   'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400',
    CANCELLED: 'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Ringkasan data Hongjoo Store</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="border border-border rounded-xl p-4 bg-card">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div>
        <h2 className="text-base font-semibold mb-3">Order Terbaru</h2>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">No. Order</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produk</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada order
                  </td>
                </tr>
              )}
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    {order.product.name} <span className="text-muted-foreground">{order.product.packageType}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[160px]">{order.customerEmail}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[order.status] ?? ''}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {order.payment ? formatRupiah(order.payment.amount) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
