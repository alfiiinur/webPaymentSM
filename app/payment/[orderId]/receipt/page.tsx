import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReceiptActions } from "./receipt-actions";

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      customerName: true,
      customerEmail: true,
      note: true,
      activationToken: true,
      createdAt: true,
      product: {
        select: {
          name: true,
          packageType: true,
          duration: true,
          durationUnit: true,
        },
      },
      store: { select: { name: true } },
      payment: {
        select: {
          status: true,
          amount: true,
          paymentMethod: true,
          paidAt: true,
          paymentReference: true,
        },
      },
      productAccess: {
        select: {
          credential: {
            select: { email: true, password: true, notes: true, status: true },
          },
        },
        take: 1,
      },
    },
  });

  if (!order) notFound();
  if (order.status !== "PAID") redirect(`/payment/${orderId}`);

  const account = await prisma.account.findUnique({
    where: { email: order.customerEmail },
    select: { status: true, activationExpiresAt: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const adminWa = process.env.ADMIN_WA_NUMBER ?? "";
  const productLabel = order.product
    ? `${order.product.name} ${order.product.packageType} ${order.product.duration} ${order.product.durationUnit}`
    : "Produk";

  const isTokenValid =
    order.activationToken &&
    account?.status === "PENDING_ACTIVATION" &&
    account.activationExpiresAt &&
    account.activationExpiresAt > new Date();

  const activationUrl = isTokenValid
    ? `${appUrl}/activate/${order.activationToken}`
    : null;
  const receiptUrl = `${appUrl}/payment/${orderId}/receipt`;

  const waMessage = [
    "Halo Admin, saya sudah melakukan pembayaran.",
    "",
    `Order: ${order.orderNumber}`,
    `Nama: ${order.customerName}`,
    `Produk: ${productLabel}`,
    `Total: ${formatRupiah(order.payment?.amount ?? 0)}`,
    `Status: PAID`,
    "",
    "Bukti:",
    receiptUrl,
  ].join("\n");
  const waUrl = `https://wa.me/${adminWa}?text=${encodeURIComponent(waMessage)}`;

  const credential = order.productAccess[0]?.credential ?? null;
  const credActive = credential && credential.status !== "INACTIVE";
  const amount = order.payment?.amount ?? 0;
  const paidAt = order.payment?.paidAt;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <p className="font-semibold text-gray-800 text-sm">Hongjoo Store</p>
          <p className="text-xs text-gray-400">Bukti Pembayaran</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {/* ── Success banner ──────────────────────────────────────────── */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-2">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-7 h-7 text-green-600"
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
          <p className="font-bold text-green-800 text-lg">
            Pembayaran Berhasil
          </p>
          <p className="text-sm text-green-700">
            Terima kasih, pesanan kamu sudah dikonfirmasi.
          </p>
        </div>

        {/* ── Order detail ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
              Detail Order
            </p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <Row
              label="No. Order"
              value={
                <span className="font-mono text-xs font-bold">
                  {order.orderNumber}
                </span>
              }
            />
            <Row label="Nama" value={order.customerName} />
            <Row label="Email" value={order.customerEmail} />
            <div className="h-px bg-gray-100" />
            <Row label="Store" value={order.store?.name ?? "—"} />
            <Row label="Produk" value={productLabel} />
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Total</span>
              <span className="text-xl font-bold text-gray-900">
                {formatRupiah(amount)}
              </span>
            </div>
            <Row
              label="Metode"
              value={
                <span className="font-medium text-gray-700">
                  {order.payment?.paymentMethod ?? "QRIS"}
                </span>
              }
            />
            <Row
              label="Status"
              value={
                <span className="flex items-center gap-1.5 text-green-700 font-semibold text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  PAID
                </span>
              }
            />
            {paidAt && (
              <Row
                label="Waktu Bayar"
                value={
                  <span className="text-xs">{formatDateTime(paidAt)}</span>
                }
              />
            )}
            {order.payment?.paymentReference && (
              <Row
                label="Transaction ID"
                value={
                  <span className="font-mono text-[11px] break-all text-gray-500">
                    {order.payment.paymentReference}
                  </span>
                }
              />
            )}
          </div>
        </div>

        {/* ── Akun digital credential ─────────────────────────────────── */}
        {credential ? (
          <div
            className={`rounded-2xl border shadow-sm overflow-hidden ${credActive ? "bg-white border-gray-200" : "bg-gray-50 border-gray-200"}`}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                Akun Digital Kamu
              </p>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${credActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
              >
                {credActive ? "● Aktif" : "● Nonaktif"}
              </span>
            </div>
            <div className="px-5 py-4 space-y-3">
              <CredRow label="Email Akun" value={credential.email} mono />
              <CredRow label="Password" value={credential.password} mono />
              {credential.notes && (
                <CredRow label="Catatan" value={credential.notes} />
              )}
              {!credActive && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">
                  Akun ini sedang nonaktif. Hubungi admin.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <p className="text-sm font-medium text-amber-800">
              Akun digital sedang disiapkan
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Admin akan segera assign akun untukmu. Hubungi admin via WhatsApp
              jika belum diterima dalam 5 menit.
            </p>
          </div>
        )}

        {/* ── Dashboard info ──────────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 space-y-2">
          <p className="text-sm font-semibold text-blue-800">
            📱 Pantau akunmu di Dashboard
          </p>
          <p className="text-xs text-blue-700">
            Semua produk yang kamu beli bisa dipantau di{" "}
            <strong>Dashboard</strong> — termasuk email, password, dan status
            akun digital kamu.
          </p>
          <p className="text-xs text-blue-600 font-medium">
            {account?.status === "ACTIVE"
              ? "✓ Akun Hongjoo kamu sudah aktif. Login sekarang!"
              : "→ Aktifkan akun Hongjoo kamu terlebih dahulu menggunakan tombol di bawah."}
          </p>
        </div>

        {/* ── Akun Hongjoo status ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 space-y-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
            Akun Hongjoo Store
          </p>
          <Row label="Email Login" value={order.customerEmail} />
          <Row
            label="Status"
            value={
              account?.status === "ACTIVE" ? (
                <span className="text-green-700 font-semibold text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  Aktif
                </span>
              ) : (
                <span className="text-amber-600 font-semibold text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  Belum Diaktifkan
                </span>
              )
            }
          />
          {account?.status === "PENDING_ACTIVATION" && (
            <p className="text-xs text-gray-500">
              Klik <strong>Aktifkan Akun</strong> di bawah untuk membuat
              password dan mengakses dashboard.
            </p>
          )}
        </div>

        {order.note && (
          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
              Catatan
            </p>
            <p className="text-sm text-gray-700">{order.note}</p>
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <ReceiptActions
          activationUrl={activationUrl}
          accountStatus={account?.status ?? "PENDING_ACTIVATION"}
          waUrl={waUrl}
          dashboardUrl="/dashboard"
        />

        <p className="text-center text-[11px] text-gray-400 pb-4">
          Simpan halaman ini sebagai bukti pembayaran ·{" "}
          <span className="font-mono break-all">{receiptUrl}</span>
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-sm text-gray-400 shrink-0">{label}</span>
      <span className="text-sm text-gray-700 text-right break-all">
        {value}
      </span>
    </div>
  );
}

function CredRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span
        className={`text-sm font-semibold text-gray-800 break-all ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
