'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDebounce } from './helpers'
import { StoreSection } from './StoreSection'
import { ProductSection } from './ProductSection'
import { ProductDetailSection } from './ProductDetailSection'
import { PaymentMethodSection } from './PaymentMethodSection'
import { CustomerInfoSection } from './CustomerInfoSection'
import { NoteSection } from './NoteSection'
import type { Store, Product, ProductDetail } from './types'

export function CheckoutForm() {
  const router = useRouter()

  // Store
  const [storeQuery, setStoreQuery]     = useState('')
  const [storeResults, setStoreResults] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [storeLoading, setStoreLoading] = useState(false)

  // Product
  const [productQuery, setProductQuery]     = useState('')
  const [productResults, setProductResults] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null)
  const [productLoading, setProductLoading] = useState(false)

  // Customer
  const [customerName, setCustomerName]   = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [note, setNote]                   = useState('')

  // Submit
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState('')

  const debouncedStoreQuery   = useDebounce(storeQuery, 300)
  const debouncedProductQuery = useDebounce(productQuery, 300)

  // Fetch stores
  const fetchStores = useCallback(async (q: string) => {
    setStoreLoading(true)
    try {
      const res  = await fetch(`/api/stores?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setStoreResults(data.stores ?? [])
    } catch {
      setStoreResults([])
    } finally {
      setStoreLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedStore) fetchStores(debouncedStoreQuery)
  }, [debouncedStoreQuery, selectedStore, fetchStores])

  // Fetch products
  const fetchProducts = useCallback(async (q: string) => {
    if (!selectedStore) return
    setProductLoading(true)
    try {
      const res  = await fetch(`/api/stores/${selectedStore.id}/products?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setProductResults(data.products ?? [])
    } catch {
      setProductResults([])
    } finally {
      setProductLoading(false)
    }
  }, [selectedStore])

  useEffect(() => {
    if (selectedStore && !selectedProduct) fetchProducts(debouncedProductQuery)
  }, [debouncedProductQuery, selectedStore, selectedProduct, fetchProducts])

  // Handlers
  function handleSelectStore(store: Store) {
    setSelectedStore(store)
    setStoreQuery(store.name)
    setStoreResults([])
    setSelectedProduct(null)
    setProductQuery('')
    setProductResults([])
  }

  function handleClearStore() {
    setSelectedStore(null)
    setStoreQuery('')
    setStoreResults([])
    setSelectedProduct(null)
    setProductQuery('')
    setProductResults([])
  }

  async function handleSelectProduct(product: Product) {
    setProductQuery(product.name)
    setProductResults([])
    setProductLoading(true)
    try {
      const res  = await fetch(`/api/products/${product.id}`)
      const data = await res.json()
      if (data.product) {
        setSelectedProduct(data.product as ProductDetail)
        setProductQuery(data.product.name)
      }
    } catch {
      // keep partial selection
    } finally {
      setProductLoading(false)
    }
  }

  function handleClearProduct() {
    setSelectedProduct(null)
    setProductQuery('')
    setProductResults([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    if (!selectedProduct) { setSubmitError('Pilih produk terlebih dahulu.'); return }
    if (!customerName.trim()) { setSubmitError('Nama wajib diisi.'); return }
    if (!customerEmail.trim() || !customerEmail.includes('@')) { setSubmitError('Email tidak valid.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId:     selectedProduct.id,
          customerName:  customerName.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          note:          note.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error ?? 'Terjadi kesalahan.'); return }
      router.push(`/payment/${data.orderId}`)
    } catch {
      setSubmitError('Gagal terhubung ke server.')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = !!selectedProduct && !!customerName.trim() && !!customerEmail.trim() && !submitting

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Left col: selections | Right col: summary — stacks on mobile */}
      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Left: Form fields ─────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Store + Product */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            <StoreSection
              query={storeQuery}
              results={storeResults}
              selected={selectedStore}
              loading={storeLoading}
              onChange={(v) => { setStoreQuery(v); if (selectedStore && v !== selectedStore.name) handleClearStore() }}
              onSelect={handleSelectStore}
              onClear={handleClearStore}
            />
            <div className="h-px bg-gray-100" />
            <ProductSection
              query={productQuery}
              results={productResults}
              selected={selectedProduct}
              loading={productLoading}
              storeSelected={!!selectedStore}
              onChange={(v) => { setProductQuery(v); if (selectedProduct && v !== selectedProduct.name) handleClearProduct() }}
              onSelect={handleSelectProduct}
              onClear={handleClearProduct}
            />
          </div>

          {/* Payment method */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <PaymentMethodSection />
          </div>

          {/* Customer info */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <CustomerInfoSection
              name={customerName}
              email={customerEmail}
              onNameChange={setCustomerName}
              onEmailChange={setCustomerEmail}
            />
          </div>

          {/* Note */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <NoteSection value={note} onChange={setNote} />
          </div>
        </div>

        {/* ── Right: Order summary ───────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 space-y-4">

            {/* Product detail card */}
            <ProductDetailSection product={selectedProduct} />

            {/* Error */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600">{submitError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-4 rounded-2xl text-sm font-semibold tracking-wide transition-all
                ${canSubmit
                  ? 'bg-gray-900 hover:bg-gray-800 text-white shadow-sm hover:shadow-md active:scale-[0.99]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                  Memproses...
                </span>
              ) : (
                'Lanjut ke Pembayaran →'
              )}
            </button>

            <p className="text-center text-xs text-gray-400">
              Pembayaran diproses aman via Midtrans
            </p>
          </div>
        </div>
      </div>
    </form>
  )
}
