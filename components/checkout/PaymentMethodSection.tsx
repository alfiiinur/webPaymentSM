export function PaymentMethodSection() {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
        Metode Pembayaran
      </p>
      <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 bg-white">
        {/* QRIS icon */}
        <div className="shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="2"  y="2"  width="9" height="9" rx="1" fill="#374151" opacity="0.9"/>
            <rect x="13" y="2"  width="9" height="9" rx="1" fill="#374151" opacity="0.5"/>
            <rect x="2"  y="13" width="9" height="9" rx="1" fill="#374151" opacity="0.5"/>
            <rect x="15" y="13" width="3" height="3" rx="0.5" fill="#374151" opacity="0.9"/>
            <rect x="20" y="13" width="2" height="3" rx="0.5" fill="#374151" opacity="0.9"/>
            <rect x="13" y="18" width="5" height="2" rx="0.5" fill="#374151" opacity="0.9"/>
            <rect x="20" y="18" width="2" height="2" rx="0.5" fill="#374151" opacity="0.9"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">QRIS</p>
          <p className="text-xs text-gray-400">GoPay · DANA · OVO · ShopeePay · Mobile Banking</p>
        </div>
        <div className="ml-auto shrink-0 w-4 h-4 rounded-full border-2 border-gray-800 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-gray-800" />
        </div>
      </div>
    </div>
  )
}
