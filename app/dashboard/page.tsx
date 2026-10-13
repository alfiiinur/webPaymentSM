import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  PENDING_ACTIVATION: "Belum Diaktifkan",
  DISABLED: "Dinonaktifkan",
};

const ACCOUNT_STATUS_BADGE: Record<string, string> = {
  ACTIVE:
    "bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400",
  PENDING_ACTIVATION:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  DISABLED:
    "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",
};

const CRED_STATUS_BADGE: Record<string, string> = {
  AVAILABLE:
    "bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400",
  USED: "bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400",
  INACTIVE:
    "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function DashboardPage() {
  const session = await getUserSession();
  if (!session) redirect("/dashboard/login");

  const account = await prisma.account.findUnique({
    where: { id: session.accountId },
    include: {
      productAccess: {
        include: {
          product: {
            include: { store: { select: { id: true, name: true } } },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              createdAt: true,
              payment: { select: { status: true, amount: true, paidAt: true } },
            },
          },
          credential: {
            select: {
              id: true,
              email: true,
              password: true,
              notes: true,
              status: true,
              hasWarranty: true,
              assignedAt: true,
            },
          },
        },
        orderBy: { grantedAt: "desc" },
      },
    },
  });

  if (!account) redirect("/dashboard/login");

  return (
    <div className="space-y-8">
      {/* Account info card */}
      <div className="border border-border rounded-2xl p-6 bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">
              Halo, {account.email.split("@")[0]} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Dashboard Hongjoo Store
            </p>
          </div>
          <span
            className={`self-start sm:self-auto px-3 py-1 rounded-full text-sm font-medium ${ACCOUNT_STATUS_BADGE[account.status] ?? ""}`}
          >
            {ACCOUNT_STATUS_LABEL[account.status] ?? account.status}
          </span>
        </div>

        <div className="mt-5 grid sm:grid-cols-3 gap-4 text-sm">
          <div className="bg-muted/40 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Email Login</p>
            <p className="font-medium mt-0.5 break-all">{account.email}</p>
          </div>
          <div className="bg-muted/40 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Status Akun</p>
            <p
              className={`font-medium mt-0.5 ${
                account.status === "ACTIVE"
                  ? "text-green-600 dark:text-green-400"
                  : account.status === "DISABLED"
                    ? "text-destructive"
                    : "text-yellow-600 dark:text-yellow-400"
              }`}
            >
              {ACCOUNT_STATUS_LABEL[account.status]}
            </p>
          </div>
          <div className="bg-muted/40 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Bergabung</p>
            <p className="font-medium mt-0.5">
              {formatDate(account.createdAt)}
            </p>
          </div>
        </div>

        {account.status === "PENDING_ACTIVATION" && (
          <div className="mt-4 rounded-xl border border-yellow-300/40 bg-yellow-50 dark:bg-yellow-900/10 p-4 text-sm text-yellow-800 dark:text-yellow-300">
            <p className="font-medium">Akun belum diaktifkan</p>
            <p className="mt-1 text-xs">
              Cek email <strong>{account.email}</strong> untuk link aktivasi.
            </p>
          </div>
        )}

        {account.status === "DISABLED" && (
          <div className="mt-4 rounded-xl border border-red-300/40 bg-red-50 dark:bg-red-900/10 p-4 text-sm text-red-800 dark:text-red-300">
            <p className="font-medium">Akun dinonaktifkan</p>
            <p className="mt-1 text-xs">
              Hubungi admin untuk informasi lebih lanjut.
            </p>
          </div>
        )}
      </div>

      {/* Purchased products */}
      <div>
        <h2 className="text-lg font-bold mb-4">
          Produk yang Dimiliki
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({account.productAccess.length})
          </span>
        </h2>

        {account.productAccess.length === 0 && (
          <div className="border border-border rounded-2xl p-10 text-center">
            <p className="text-4xl mb-3">🛒</p>
            <p className="text-muted-foreground">Kamu belum memiliki produk.</p>
            <Link
              href="/"
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Lihat Produk
            </Link>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {account.productAccess.map((pa) => {
            const isPaid = pa.order.status === "PAID";
            const cred = pa.credential;
            const credActive = cred && cred.status !== "INACTIVE";

            return (
              <div
                key={pa.id}
                className="border border-border rounded-2xl bg-card overflow-hidden"
              >
                {/* Product header */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{pa.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {pa.product.store.name} · {pa.product.packageType} ·{" "}
                        {pa.product.duration} {pa.product.durationUnit}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                        isPaid
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                      }`}
                    >
                      {isPaid ? "Lunas" : pa.order.status}
                    </span>
                  </div>

                  {/* Order meta */}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div className="flex justify-between">
                      <span>No. Order</span>
                      <span className="font-mono text-foreground">
                        {pa.order.orderNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Harga</span>
                      <span className="text-foreground font-medium">
                        {pa.order.payment
                          ? formatRupiah(pa.order.payment.amount)
                          : formatRupiah(pa.product.price)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tanggal beli</span>
                      <span>{formatDate(pa.order.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Credential section */}
                <div
                  className={`border-t border-border p-5 ${credActive ? "bg-muted/20" : "bg-muted/5"}`}
                >
                  {!cred ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>⏳</span>
                      <span>
                        Akun digital sedang disiapkan. Hubungi admin jika belum
                        diterima.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">
                            Akun {pa.product.name}
                          </p>
                          {cred.hasWarranty && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                              🛡️ GARANSI
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${CRED_STATUS_BADGE[cred.status]}`}
                        >
                          {credActive ? "✓ Aktif" : "✕ Nonaktif"}
                        </span>
                      </div>

                      {/* Replacement notice */}
                      {"replacedAt" in pa && pa.replacedAt && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700 flex items-start gap-2">
                          <span className="shrink-0">🔄</span>
                          <span>
                            Akun ini baru saja diganti oleh admin pada{" "}
                            {formatDate(pa.replacedAt as Date)}. Gunakan
                            credential terbaru di bawah.
                          </span>
                        </div>
                      )}

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-3 bg-background rounded-lg px-3 py-2 border border-border">
                          <span className="text-xs text-muted-foreground shrink-0">
                            Email
                          </span>
                          <span className="font-mono text-xs font-medium break-all">
                            {cred.email}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 bg-background rounded-lg px-3 py-2 border border-border">
                          <span className="text-xs text-muted-foreground shrink-0">
                            Password
                          </span>
                          <span className="font-mono text-xs font-medium">
                            {cred.password}
                          </span>
                        </div>
                        {cred.notes && (
                          <div className="flex items-start gap-3 bg-background rounded-lg px-3 py-2 border border-border">
                            <span className="text-xs text-muted-foreground shrink-0">
                              Catatan
                            </span>
                            <span className="text-xs">{cred.notes}</span>
                          </div>
                        )}
                      </div>

                      {!credActive && cred.hasWarranty && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                          🛡️ Akun ini bergaransi. Admin sedang menyiapkan
                          pengganti — cek kembali halaman ini dalam beberapa
                          saat.
                        </p>
                      )}
                      {!credActive && !cred.hasWarranty && (
                        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                          Akun ini telah dinonaktifkan oleh admin. Hubungi admin
                          untuk informasi lebih lanjut.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
