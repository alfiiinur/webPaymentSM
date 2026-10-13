"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface PaymentClientProps {
  orderId: string;
  orderNumber: string;
  snapToken: string;
  productName: string;
  amount: number;
}

type OrderStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function PaymentClient({
  orderId,
  orderNumber,
  snapToken,
  productName,
  amount,
}: PaymentClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>("PENDING");
  const [isPolling, setIsPolling] = useState(false);
  const [snapOpened, setSnapOpened] = useState(false);
  const [snapClosed, setSnapClosed] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  const MAX_POLLS = (10 * 60 * 1000) / 3000;

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    setIsPolling(true);
    pollCountRef.current = 0;
    pollingRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLLS) {
        stopPolling();
        return;
      }
      try {
        const res = await fetch(`/api/orders/${orderId}/status`);
        if (!res.ok) return;
        const data = (await res.json()) as { status: OrderStatus };
        setStatus(data.status);
        if (data.status === "PAID") {
          stopPolling();
          setTimeout(() => router.push(`/payment/${orderId}/receipt`), 800);
        } else if (data.status === "FAILED" || data.status === "EXPIRED") {
          stopPolling();
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
  }, [orderId, router, stopPolling, MAX_POLLS]);

  function openSnap() {
    if (typeof window !== "undefined" && window.snap) {
      setSnapOpened(true);
      setSnapClosed(false);
      window.snap.pay(snapToken, {
        onSuccess: () => startPolling(),
        onPending: () => startPolling(),
        onError: () => setStatus("FAILED"),
        onClose: () => {
          setSnapClosed(true);
          startPolling();
        },
      });
    } else {
      timeoutRef.current = setTimeout(openSnap, 500);
    }
  }

  useEffect(() => {
    timeoutRef.current = setTimeout(openSnap, 300);
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPaid = status === "PAID";
  const isFailed = status === "FAILED" || status === "EXPIRED";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <p className="font-semibold text-gray-800 text-sm">Hongjoo Store</p>
          <p className="text-xs text-gray-400">Pembayaran Aman · Midtrans</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {/* Order summary card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Detail Pembayaran
          </p>
          <div className="space-y-2.5">
            <Row
              label="No. Order"
              value={<span className="font-mono text-xs">{orderNumber}</span>}
            />
            <Row label="Produk" value={productName} />
            <Row
              label="Metode"
              value={<span className="text-gray-700 font-medium">QRIS</span>}
            />
            <div className="h-px bg-gray-100 my-1" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-xl font-bold text-gray-900">
                {formatRupiah(amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Status card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center space-y-4">
          {isPaid && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="font-bold text-lg text-green-700">
                  Pembayaran Berhasil!
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Mengalihkan ke halaman receipt...
                </p>
              </div>
            </>
          )}

          {isFailed && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div>
                <p className="font-bold text-lg text-red-600">
                  Pembayaran Gagal
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Order dibatalkan atau kadaluarsa.
                </p>
              </div>
              <a
                href="/checkout"
                className="inline-block px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Kembali ke Checkout
              </a>
            </>
          )}

          {!isPaid && !isFailed && (
            <>
              {!snapOpened ? (
                <>
                  <div className="flex justify-center">
                    <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Memuat halaman pembayaran...
                  </p>
                </>
              ) : snapClosed ? (
                <>
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl">⏳</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      Menunggu Konfirmasi
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Halaman akan berpindah otomatis setelah pembayaran
                      terkonfirmasi.
                    </p>
                  </div>
                  {isPolling && (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      <span className="text-xs text-gray-400">
                        Memeriksa status...
                      </span>
                    </div>
                  )}
                  <button
                    onClick={openSnap}
                    className="text-sm text-gray-600 underline underline-offset-2 hover:text-gray-800"
                  >
                    Buka kembali halaman bayar
                  </button>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Halaman pembayaran sedang terbuka...
                  </p>
                  <p className="text-xs text-gray-400">
                    Scan QR code dengan e-wallet kamu
                  </p>
                </>
              )}
            </>
          )}
        </div>

        {!isPaid && !isFailed && (
          <p className="text-center text-xs text-gray-400">
            Jangan tutup halaman ini sebelum pembayaran selesai
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-gray-700">{value}</span>
    </div>
  );
}
