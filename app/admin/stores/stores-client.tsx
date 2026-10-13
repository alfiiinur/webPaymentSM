'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Store = {
  id: string
  name: string
  slug: string
  createdAt: Date | string
  _count: { products: number; orders: number }
}

type Props = { initialStores: Store[] }

export default function StoresClient({ initialStores }: Props) {
  const router = useRouter()
  const [stores, setStores]       = useState<Store[]>(initialStores)
  const [showForm, setShowForm]   = useState(false)
  const [editStore, setEditStore] = useState<Store | null>(null)
  const [name, setName]           = useState('')
  const [slug, setSlug]           = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  function openCreate() {
    setEditStore(null)
    setName('')
    setSlug('')
    setError('')
    setShowForm(true)
  }

  function openEdit(store: Store) {
    setEditStore(store)
    setName(store.name)
    setSlug(store.slug)
    setError('')
    setShowForm(true)
  }

  function autoSlug(v: string) {
    setSlug(v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
  }

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      const res = editStore
        ? await fetch(`/api/admin/stores/${editStore.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, slug }),
          })
        : await fetch('/api/admin/stores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, slug }),
          })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal menyimpan'); return }

      setShowForm(false)
      router.refresh()
      // Optimistically update list
      const fresh = await fetch('/api/admin/stores').then((r) => r.json())
      setStores(fresh.stores)
    } catch {
      setError('Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(store: Store) {
    if (!confirm(`Hapus store "${store.name}"? Tidak bisa dibatalkan.`)) return
    const res = await fetch(`/api/admin/stores/${store.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { alert(data.error ?? 'Gagal menghapus'); return }
    setStores((prev) => prev.filter((s) => s.id !== store.id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stores</h1>
          <p className="text-sm text-muted-foreground mt-1">{stores.length} store terdaftar</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Tambah Store
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nama</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Produk</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Order</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {stores.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada store. Tambahkan store pertama.
                </td>
              </tr>
            )}
            {stores.map((store) => (
              <tr key={store.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{store.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{store.slug}</td>
                <td className="px-4 py-3 text-center">{store._count.products}</td>
                <td className="px-4 py-3 text-center">{store._count.orders}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => openEdit(store)}
                    className="px-3 py-1 rounded-md text-xs border border-border hover:bg-accent transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(store)}
                    className="px-3 py-1 rounded-md text-xs border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">
              {editStore ? 'Edit Store' : 'Tambah Store'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nama Store</label>
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (!editStore) autoSlug(e.target.value) }}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Netflix Official"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Slug</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="netflix-official"
                />
                <p className="text-xs text-muted-foreground mt-1">Hanya huruf kecil, angka, dan tanda hubung</p>
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
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
