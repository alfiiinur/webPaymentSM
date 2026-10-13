'use client'

const inputCls = `w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800
  placeholder-gray-400 bg-white outline-none focus:border-gray-500 focus:ring-2
  focus:ring-gray-100 transition-all`

interface Props {
  name: string
  email: string
  onNameChange: (v: string) => void
  onEmailChange: (v: string) => void
}

export function CustomerInfoSection({ name, email, onNameChange, onEmailChange }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
        Informasi Pembeli
      </p>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Nama Lengkap <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Contoh: Budi Santoso"
          required
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Email <span className="text-red-400">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="email@contoh.com"
          required
          className={inputCls}
        />
        <p className="text-[11px] text-gray-400 mt-1.5">
          Link aktivasi akun akan dikirim ke email ini setelah pembayaran berhasil
        </p>
      </div>
    </div>
  )
}
