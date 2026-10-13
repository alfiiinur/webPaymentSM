'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type StoreOption = { id: string; name: string }
type Product = {
  id: string
  name: string
  packageType: string
  duration: number
  durationUnit: string
  price: number
  isActive: boolean
  storeId: string
  store: { id: string; name: string }
  createdAt: Date | string
  _count: { orders: number; productAccess: number }
}

type Props = { initialProducts: Product[]; stores: StoreOption[] }

const emptyForm = { storeId: '', name: '', packageType: '', duration: '', durationUnit: 'Bulan', price: '', isActive: true }

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function ProductsClient({ initialProducts, stores }: Props) {
  const router = useRouter()
  const [products, setProducts]   = useState<Product[]>(initialProducts)
  const [showForm, setShowForm]   = useState(false)
  const [editProd, setEditProd]   = useState<Product | null>(null)
  const [form, setForm]           = useState(emptyForm)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [filter, setFilter]       = useState<'all' | 'active' | 'inactive'>('all')

  const filtered = products.filter((p) => {
    if (filter === 'active')   return p.isActive
    if (filter === 'inactive') return !p.isActive
    return true
  })

  function openCreate() {
    setEditProd(null)
    setForm({ ...emptyForm, storeId: stores[0]?.id ?? '' })
    setError('')
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditProd(p)
    setForm({
      storeId:      p.storeId,
      name:         p.name,
      packageType:  p.packageType,
      duration:     String(p.duration),
      durationUnit: p.durationUnit,
      price:        String(p.price),
      isActive:     p.isActive,
    })
    setError('')
    setShowForm(true)
  }

  async function handleSubmit() {
    setError('')
    setLoading(true)
    const payload = {
      storeId:      form.storeId,
      name:         form.name,
      packageType:  form.packageType,
      duration:     parseInt(form.duration, 10),
      durationUnit: form.durationUnit,
      price:        parseInt(form.price, 10),
      isActive:     form.isActive,
    }
    try {
      const res = editProd
        ? await fetch(`/api/admin/products/${editProd.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/products', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal menyimpan'); return }
      setShowForm(false)
      router.refresh()
      const fresh = await fetch('/api/admin/products').then((r) => r.json())
      setProducts(fresh.products)
    } catch {
      setError('Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Hapus / nonaktifkan produk "${p.name} ${p.packageType}"?`)) return
    const res  = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { alert(data.error ?? 'Gagal'); return }
    const fresh = await fetch('/api/admin/products').then((r) => r.json())
    setProducts(fresh.products)
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">{products.length} produk</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          + Tambah Produk
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 text-sm">
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}
          >
            {f === 'all' ? 'Semua' : f === 'active' ? 'Aktif' : 'Nonaktif'}
          </button>
        ))}
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produk</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Store</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Durasi</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Harga</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Orders</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Tidak ada produk</td></tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.packageType}</p>
                  <p className="text-xs text-muted-foreground font-mono">{p.id}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.store.name}</td>
                <td className="px-4 py-3">{p.duration} {p.durationUnit}</td>
                <td className="px-4 py-3 text-right font-medium">{formatRupiah(p.price)}</td>
                <td className="px-4 py-3 text-center">{p._count.orders}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                    {p.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(p)} className="px-3 py-1 rounded-md text-xs border border-border hover:bg-accent transition-colors">Edit</button>
                  <button onClick={() => handleDelete(p)} className="px-3 py-1 rounded-md text-xs border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-semibold mb-4">{editProd ? 'Edit Produk' : 'Tambah Produk'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Store</label>
                <select value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })} className={inputCls}>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Nama Produk</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Netflix" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Tipe Paket</label>
                <input value={form.packageType} onChange={(e) => setForm({ ...form, packageType: e.target.value })} className={inputCls} placeholder="Premium / Basic / Family" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Durasi</label>
                  <input type="number" min="1" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className={inputCls} placeholder="1" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Satuan</label>
                  <select value={form.durationUnit} onChange={(e) => setForm({ ...form, durationUnit: e.target.value })} className={inputCls}>
                    <option value="Hari">Hari</option>
                    <option value="Bulan">Bulan</option>
                    <option value="Tahun">Tahun</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Harga (Rp)</label>
                <input type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} placeholder="50000" />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="isActive" className="text-sm">Produk aktif (bisa dibeli)</label>
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors">Batal</button>
                <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
