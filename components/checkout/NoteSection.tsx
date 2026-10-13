'use client'

interface Props {
  value: string
  onChange: (v: string) => void
}

export function NoteSection({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        Catatan <span className="text-gray-400 font-normal">(opsional)</span>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ada permintaan khusus?"
        rows={3}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 bg-white outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100 transition-all resize-none"
      />
    </div>
  )
}
