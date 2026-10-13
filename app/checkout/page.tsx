import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <p className="font-semibold text-gray-800 text-sm">Hongjoo Store</p>
          <p className="text-xs text-gray-400">Pembayaran Aman · Otomatis</p>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="text-gray-800 font-medium">Checkout</span>
          <span>›</span>
          <span>Pembayaran</span>
          <span>›</span>
          <span>Selesai</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Buat Pesanan</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pilih produk dan isi data diri kamu
          </p>
        </div>

        <CheckoutForm />
      </div>
    </div>
  );
}
