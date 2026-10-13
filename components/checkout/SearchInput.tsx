'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder: string
  disabled?: boolean
  results: Array<Record<string, string | number>>
  onSelect: (item: Record<string, string | number>) => void
  displayKey: string
  renderItem?: (item: Record<string, string | number>) => React.ReactNode
  loading?: boolean
  onClear?: () => void
  selected?: boolean
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  disabled,
  results,
  onSelect,
  displayKey,
  renderItem,
  loading,
  onClear,
  selected,
}: Props) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(item: Record<string, string | number>) {
    onChange(String(item[displayKey]))
    onSelect(item)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full border rounded-xl px-4 py-3 text-sm bg-white transition-all outline-none
            ${disabled
              ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
              : selected
              ? 'border-gray-300 text-gray-800 pr-10 bg-gray-50'
              : 'border-gray-300 text-gray-800 placeholder-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-100'
            }`}
        />

        {/* Loading spinner */}
        {loading && !selected && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Clear button */}
        {selected && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors text-xs font-bold"
            aria-label="Clear"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden divide-y divide-gray-50">
          {results.map((item, i) => (
            <li
              key={i}
              onMouseDown={() => handleSelect(item)}
              className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              {renderItem ? renderItem(item) : String(item[displayKey])}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
