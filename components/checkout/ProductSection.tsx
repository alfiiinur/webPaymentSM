'use client'

import { SectionLabel } from './SectionLabel'
import { SearchInput } from './SearchInput'
import { formatRupiah } from './helpers'
import type { Product } from './types'

interface Props {
  query: string
  results: Product[]
  selected: Product | null
  loading: boolean
  storeSelected: boolean
  onChange: (v: string) => void
  onSelect: (product: Product) => void
  onClear: () => void
}

export function ProductSection({ query, results, selected, loading, storeSelected, onChange, onSelect, onClear }: Props) {
  return (
    <div>
      <SectionLabel label="Produk" />
      <SearchInput
        value={query}
        onChange={onChange}
        placeholder={storeSelected ? 'Cari produk...' : 'Pilih store terlebih dahulu'}
        disabled={!storeSelected}
        results={results as unknown as Array<Record<string, string | number>>}
        onSelect={(item) => onSelect(item as unknown as Product)}
        displayKey="name"
        loading={loading}
        selected={!!selected}
        onClear={onClear}
        renderItem={(item) => (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-gray-800">{String(item.name)}</p>
              <p className="text-xs text-gray-400">{String(item.packageType)} · {String(item.duration)} {String(item.durationUnit)}</p>
            </div>
            <p className="text-sm font-semibold text-gray-700 shrink-0">{formatRupiah(Number(item.price))}</p>
          </div>
        )}
      />
      {selected && (
        <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
          <span>✓</span> Produk dipilih
        </p>
      )}
    </div>
  )
}
