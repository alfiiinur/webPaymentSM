import { formatRupiah } from './helpers'
import type { ProductDetail } from './types'

interface Props {
  product: ProductDetail | null
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-medium ${value ? 'text-gray-800' : 'text-gray-300'}`}>
        {value || '—'}
      </p>
    </div>
  )
}

export function ProductDetailSection({ product }: Props) {
  return (
    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
        Detail Produk
      </p>

      {!product ? (
        <p className="text-sm text-gray-400 text-center py-4">Pilih produk untuk melihat detail</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-4">
            <DetailField label="Nama Produk" value={product.name} />
            <DetailField label="Tipe Paket"  value={product.packageType} />
            <DetailField label="Durasi"      value={product.duration ? `${product.duration} ${product.durationUnit}` : ''} />
            <DetailField label="Store"       value={product.store?.name ?? ''} />
          </div>

          <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">Total Pembayaran</p>
            <p className="text-xl font-bold text-gray-900">{formatRupiah(product.price)}</p>
          </div>
        </>
      )}
    </div>
  )
}
