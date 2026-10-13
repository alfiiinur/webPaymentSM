"use client";

import { useState, useTransition } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Payment = {
  id: string;
  status: string;
  amount: number;
  paidAt: string | null;
  paymentMethod: string;
} | null;

type Credential = {
  id: string;
  email: string;
  status: string;
} | null;

type ProductAccess = {
  id: string;
  credentialId: string | null;
  credential: Credential;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  note: string | null;
  createdAt: string;
  product: { id: string; name: string; packageType: string };
  store: { id: string; name: string };
  payment: Payment;
  productAccess: ProductAccess[];
};

type Props = { initialOrders: Order[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  PAID: "bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400",
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  FAILED:
    "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",
  EXPIRED:
    "bg-gray-100   text-gray-500   dark:bg-gray-800      dark:text-gray-400",
  CANCELLED:
    "bg-gray-100   text-gray-500   dark:bg-gray-800      dark:text-gray-400",
};

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Cek apakah order sudah PAID tapi belum punya credential sama sekali */
function needsCredential(order: Order): boolean {
  if (order.status !== "PAID") return false;
  if (order.productAccess.length === 0) return true;
  return order.productAccess.some((pa) => pa.credentialId === null);
}

// ── Assign Credential Modal ───────────────────────────────────────────────────

function AssignCredentialModal({
  order,
  onClose,
  onSuccess,
}: {
  order: Order;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  async function handleAutoAssign() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/orders/${order.id}/fulfill`, {
          method: "POST",
        });
        const data = await res.json();

        if (!res.ok) {
          setResult({
            success: false,
            message: data.error ?? "Terjadi kesalahan",
          });
          return;
        }

        setResult({
          success: data.success ?? true,
          message: data.message,
        });

        if (data.success) {
          onSuccess(order.id);
        }
      } catch {
        setResult({ success: false, message: "Gagal terhubung ke server" });
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Assign Credential</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Info order */}
          <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="w-28 text-muted-foreground shrink-0">
                No. Order
              </span>
              <span className="font-mono font-medium">{order.orderNumber}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 text-muted-foreground shrink-0">
                Customer
              </span>
              <span className="font-medium">{order.customerEmail}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 text-muted-foreground shrink-0">
                Produk
              </span>
              <span className="font-medium">
                {order.product.name} — {order.product.packageType}
              </span>
            </div>
          </div>

          {/* Warning */}
          <div className="flex gap-3 items-start rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-sm">
            <span className="text-lg leading-none mt-0.5">⚠️</span>
            <p className="text-amber-800 dark:text-amber-300">
              Order ini sudah lunas tapi belum mendapat akun. Sistem akan
              mencari slot credential yang tersedia untuk produk ini dan
              meng-assign-nya secara otomatis.
            </p>
          </div>

          {/* Result */}
          {result && (
            <div
              className={`flex gap-3 items-start rounded-xl border p-4 text-sm ${
                result.success
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
              }`}
            >
              <span className="text-lg leading-none mt-0.5">
                {result.success ? "✅" : "❌"}
              </span>
              <p>{result.message}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          {!result?.success ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAutoAssign}
                disabled={isPending}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {isPending ? "Memproses…" : "Assign Otomatis"}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OrdersClient({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Order | null>(null);
  const [assignTarget, setAssignTarget] = useState<Order | null>(null);

  // Jumlah order PAID tanpa credential (untuk badge notifikasi)
  const needsCredentialCount = orders.filter(needsCredential).length;

  const filtered = orders.filter((o) => {
    if (filter === "needs_credential") return needsCredential(o);
    const matchStatus = filter === "all" || o.status === filter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // Setelah assign berhasil, tandai productAccess sebagai sudah assigned
  // (mark optimistic — reload sesungguhnya dilakukan saat user refresh)
  function handleAssignSuccess(orderId: string) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              productAccess: o.productAccess.map((pa) =>
                pa.credentialId === null
                  ? { ...pa, credentialId: "__assigned__", credential: null }
                  : pa,
              ),
            }
          : o,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {orders.length} order total
          {needsCredentialCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
              ⚠️ {needsCredentialCount} butuh akun
            </span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari order no., email, nama..."
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
        />
        <div className="flex flex-wrap gap-2 text-sm">
          {(
            [
              { key: "all", label: "Semua" },
              { key: "PENDING", label: "PENDING" },
              { key: "PAID", label: "PAID" },
              { key: "FAILED", label: "FAILED" },
              { key: "EXPIRED", label: "EXPIRED" },
              {
                key: "needs_credential",
                label: `⚠️ Butuh Akun${needsCredentialCount > 0 ? ` (${needsCredentialCount})` : ""}`,
              },
            ] as { key: string; label: string }[]
          ).map((s) => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filter === s.key
                  ? s.key === "needs_credential"
                    ? "bg-amber-500 text-white"
                    : "bg-primary text-primary-foreground"
                  : s.key === "needs_credential" && needsCredentialCount > 0
                    ? "border border-amber-400 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    : "border border-border hover:bg-accent"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                No. Order
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Customer
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Produk
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Tanggal
              </th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                Amount
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {filter === "needs_credential"
                    ? "Tidak ada order yang membutuhkan akun 🎉"
                    : "Tidak ada order"}
                </td>
              </tr>
            )}
            {filtered.map((o) => {
              const needs = needsCredential(o);
              return (
                <tr
                  key={o.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/20 ${
                    needs ? "bg-amber-50/40 dark:bg-amber-900/10" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">{o.orderNumber}</span>
                    {needs && (
                      <span
                        className="ml-1.5 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 align-middle"
                        title="Order lunas tapi belum dapat akun"
                      >
                        Butuh Akun
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p>{o.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.customerEmail}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{o.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.product.packageType}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatDate(o.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[o.status] ?? ""}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {o.payment ? formatRupiah(o.payment.amount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {needs && (
                        <button
                          onClick={() => setAssignTarget(o)}
                          className="px-3 py-1 rounded-md text-xs bg-amber-500 hover:bg-amber-600 text-white transition-colors font-medium"
                        >
                          Assign Akun
                        </button>
                      )}
                      <button
                        onClick={() => setDetail(o)}
                        className="px-3 py-1 rounded-md text-xs border border-border hover:bg-accent transition-colors"
                      >
                        Lihat
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold">Detail Order</h2>
              <button
                onClick={() => setDetail(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <dl className="space-y-3 text-sm">
              {(
                [
                  ["No. Order", detail.orderNumber],
                  ["Status", detail.status],
                  ["Nama", detail.customerName],
                  ["Email", detail.customerEmail],
                  ["Store", detail.store.name],
                  [
                    "Produk",
                    `${detail.product.name} — ${detail.product.packageType}`,
                  ],
                  ["Product ID", detail.product.id],
                  ["Catatan", detail.note || "—"],
                  ["Tanggal", formatDate(detail.createdAt)],
                  ["Pembayaran", detail.payment?.status ?? "—"],
                  ["Metode", detail.payment?.paymentMethod ?? "—"],
                  [
                    "Amount",
                    detail.payment ? formatRupiah(detail.payment.amount) : "—",
                  ],
                  [
                    "Lunas pada",
                    detail.payment?.paidAt
                      ? formatDate(detail.payment.paidAt)
                      : "—",
                  ],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="w-32 shrink-0 text-muted-foreground">{k}</dt>
                  <dd className="font-medium break-all">{v}</dd>
                </div>
              ))}
            </dl>

            {/* Credential info */}
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Credential / Akun
              </p>
              {detail.productAccess.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada data akses
                </p>
              ) : (
                detail.productAccess.map((pa) => (
                  <div
                    key={pa.id}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      pa.credentialId
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                        : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                    }`}
                  >
                    {pa.credential ? (
                      <span className="text-green-700 dark:text-green-400">
                        ✅ {pa.credential.email}
                      </span>
                    ) : pa.credentialId === "__assigned__" ? (
                      <span className="text-green-700 dark:text-green-400">
                        ✅ Credential baru di-assign (refresh untuk detail)
                      </span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400">
                        ⚠️ Belum ada credential
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex gap-3">
              {needsCredential(detail) && (
                <button
                  onClick={() => {
                    setDetail(null);
                    setAssignTarget(detail);
                  }}
                  className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors"
                >
                  Assign Akun
                </button>
              )}
              <button
                onClick={() => setDetail(null)}
                className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Credential Modal */}
      {assignTarget && (
        <AssignCredentialModal
          order={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSuccess={(orderId) => {
            handleAssignSuccess(orderId);
            setAssignTarget(null);
          }}
        />
      )}
    </div>
  );
}
