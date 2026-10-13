'use client'

import { SectionLabel } from './SectionLabel'
import { SearchInput } from './SearchInput'
import type { Store } from './types'

interface Props {
  query: string
  results: Store[]
  selected: Store | null
  loading: boolean
  onChange: (v: string) => void
  onSelect: (store: Store) => void
  onClear: () => void
}

export function StoreSection({ query, results, selected, loading, onChange, onSelect, onClear }: Props) {
  return (
    <div>
      <SectionLabel label="Store" />
      <SearchInput
        value={query}
        onChange={onChange}
        placeholder="Cari nama store..."
        results={results as unknown as Array<Record<string, string | number>>}
        onSelect={(item) => onSelect(item as unknown as Store)}
        displayKey="name"
        loading={loading}
        selected={!!selected}
        onClear={onClear}
        renderItem={(item) => (
          <div>
            <p className="font-medium text-gray-800">{String(item.name)}</p>
            <p className="text-xs text-gray-400">{String(item.slug)}</p>
          </div>
        )}
      />
      {selected && (
        <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
          <span>✓</span> Store dipilih
        </p>
      )}
    </div>
  )
}
