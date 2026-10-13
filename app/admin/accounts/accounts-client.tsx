'use client'

import { useState } from 'react'

type Account = {
  id: string
  email: string
  status: 'ACTIVE' | 'PENDING_ACTIVATION' | 'DISABLED'
  createdAt: string | Date
  updatedAt: string | Date
  _count: { productAccess: number }
}

type ProductAccessItem = {
  id: string
  grantedAt: string | Date
  product: {
    id: string
    name: string
    packageType: string
    duration: number
    durationUnit: string
    price: number
    store: { name: string }
  }
  order: {
    id: string
    orderNumber: string
    status: string
    createdAt: string | Date
    payment: { status: string; amount: number; paidAt: string | null } | null
  }
}

type AccountDetail = Account & { productAccess: ProductAccessItem[] }

type Props = { initialAccounts: Account[] }

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:              'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
  PENDING_ACTIVATION:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  DISABLED:            'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function AccountsClient({ initialAccounts }: Props) {
  const [accounts, setAccounts]   = useState<Account[]>(initialAccounts)
  const [filter, setFilter]       = useState<string>('all')
  const [search, setSearch]       = useState('')
  const [detail, setDetail]       = useState<AccountDetail | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const filtered = accounts.filter((a) => {
    const matchStatus = filter === 'all' || a.status === filter
    const matchSearch = !search || a.email.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  async function openDetail(accountId: string) {
    setLoadingId(accountId)
    try {
      const res  = await fetch(`/api/admin/accounts/${accountId}`)
      const data = await res.json()
      setDetail(data.account)
    } finally {
      setLoadingId(null)
    }
  }

  async function updateStatus(accountId: string, status: 'ACTIVE' | 'DISABLED' | 'PENDING_ACTIVATION') {
    const res  = await fetch(`/api/admin/accounts/${accountId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error ?? 'Gagal update'); return }
    setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, status: data.account.status } : a))
    if (detail?.id === accountId) setDetail((d) => d ? { ...d, status: data.account.status } : d)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Accounts</h1>
        <p className="text-sm text-muted-foreground mt-1">{accounts.length} akun terdaftar</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari email..."
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
        />
        <div className="flex gap-2 text-sm">
          {['all', 'ACTIVE', 'PENDING_ACTIVATION', 'DISABLED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${filter === s ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}
            >
              {s === 'all' ? 'Semua' : s === 'PENDING_ACTIVATION' ? 'Pending' : s === 'ACTIVE' ? 'Aktif' : 'Disabled'}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Produk</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dibuat</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Tidak ada akun</td></tr>
            )}
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">{a.email}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[a.status] ?? ''}`}>
                    {a.status === 'PENDING_ACTIVATION' ? 'Pending' : a.status === 'ACTIVE' ? 'Aktif' : 'Disabled'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">{a._count.productAccess}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(a.createdAt)}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => openDetail(a.id)}
                    disabled={loadingId === a.id}
                    className="px-3 py-1 rounded-md text-xs border border-border hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {loadingId === a.id ? '...' : 'Detail'}
                  </button>
                  {a.status === 'ACTIVE' && (
                    <button
                      onClick={() => updateStatus(a.id, 'DISABLED')}
                      className="px-3 py-1 rounded-md text-xs border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Disable
                    </button>
                  )}
                  {a.status === 'DISABLED' && (
                    <button
                      onClick={() => updateStatus(a.id, 'ACTIVE')}
                      className="px-3 py-1 rounded-md text-xs border border-green-500/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    >
                      Aktifkan
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-end z-50">
          <div className="w-full max-w-xl h-full bg-card border-l border-border p-6 overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">{detail.email}</h2>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[detail.status]}`}>
                  {detail.status === 'PENDING_ACTIVATION' ? 'Pending Aktivasi' : detail.status === 'ACTIVE' ? 'Aktif' : 'Disabled'}
                </span>
              </div>
              <button onClick={() => setDetail(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="mb-4 text-xs text-muted-foreground space-y-1">
              <p>ID: <span className="font-mono">{detail.id}</span></p>
              <p>Dibuat: {formatDate(detail.createdAt)}</p>
              <p>Diupdate: {formatDate(detail.updatedAt)}</p>
            </div>

            {/* Status actions */}
            <div className="flex gap-2 mb-6">
              {detail.status !== 'ACTIVE' && (
                <button onClick={() => updateStatus(detail.id, 'ACTIVE')} className="px-3 py-1.5 rounded-lg text-xs border border-green-500/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                  ✓ Aktifkan
                </button>
              )}
              {detail.status !== 'DISABLED' && (
                <button onClick={() => updateStatus(detail.id, 'DISABLED')} className="px-3 py-1.5 rounded-lg text-xs border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                  ✕ Disable
                </button>
              )}
            </div>

            <h3 className="text-sm font-semibold mb-3">Produk yang Dimiliki ({detail.productAccess.length})</h3>
            {detail.productAccess.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada produk.</p>
            )}
            <div className="space-y-3">
              {detail.productAccess.map((pa) => (
                <div key={pa.id} className="border border-border rounded-xl p-4 text-sm space-y-1">
                  <p className="font-medium">{pa.product.name} — {pa.product.packageType}</p>
                  <p className="text-muted-foreground text-xs">{pa.product.store.name} · {pa.product.duration} {pa.product.durationUnit} · {formatRupiah(pa.product.price)}</p>
                  <p className="text-xs">Order: <span className="font-mono">{pa.order.orderNumber}</span> · <span className={`${pa.order.status === 'PAID' ? 'text-green-600' : 'text-muted-foreground'}`}>{pa.order.status}</span></p>
                  <p className="text-xs text-muted-foreground">Diberikan: {formatDate(pa.grantedAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
