import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/activation";
import { ActivateForm } from "./activate-form";
import Link from "next/link";

export default async function ActivatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const hashedToken = hashToken(token);

  const account = await prisma.account.findFirst({
    where: { activationTokenHash: hashedToken },
    select: { email: true, status: true, activationExpiresAt: true },
  });

  // ── Invalid token ─────────────────────────────────────────────────────────
  if (!account) {
    return (
      <Page>
        <StatusCard
          icon="🔗"
          iconBg="bg-red-100"
          iconColor="text-red-500"
          title="Link Tidak Valid"
          titleColor="text-red-600"
        >
          <p className="text-sm text-gray-500">
            Link aktivasi tidak valid atau sudah digunakan.
          </p>
          <p className="text-xs text-gray-400">
            Pastikan link yang digunakan benar dari halaman receipt.
          </p>
        </StatusCard>
      </Page>
    );
  }

  // ── Already activated ──────────────────────────────────────────────────────
  if (account.status === "ACTIVE") {
    return (
      <Page>
        <StatusCard
          icon="✓"
          iconBg="bg-green-100"
          iconColor="text-green-600"
          title="Akun Sudah Aktif"
          titleColor="text-green-700"
        >
          <p className="text-sm text-gray-500">
            Akun{" "}
            <span className="font-medium text-gray-700">{account.email}</span>{" "}
            sudah aktif.
          </p>
          <Link
            href="/dashboard/login"
            className="inline-block w-full text-center py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Masuk ke Dashboard →
          </Link>
        </StatusCard>
      </Page>
    );
  }

  // ── Token expired ──────────────────────────────────────────────────────────
  const isExpired =
    account.activationExpiresAt && account.activationExpiresAt < new Date();
  if (isExpired) {
    return (
      <Page>
        <StatusCard
          icon="⏰"
          iconBg="bg-orange-100"
          iconColor="text-orange-500"
          title="Link Kadaluarsa"
          titleColor="text-orange-600"
        >
          <p className="text-sm text-gray-500">
            Link aktivasi untuk{" "}
            <span className="font-medium text-gray-700">{account.email}</span>{" "}
            sudah kadaluarsa (24 jam).
          </p>
          <p className="text-xs text-gray-400">
            Hubungi admin untuk mendapatkan link aktivasi baru.
          </p>
        </StatusCard>
      </Page>
    );
  }

  // ── Valid token ────────────────────────────────────────────────────────────
  const hoursLeft = account.activationExpiresAt
    ? Math.max(
        0,
        Math.floor(
          (account.activationExpiresAt.getTime() - Date.now()) / 1000 / 60 / 60,
        ),
      )
    : null;

  return (
    <Page>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Buat Password</h1>
          <p className="text-sm text-gray-500 mt-1">
            Aktifkan akun untuk mengakses produk yang sudah kamu beli.
          </p>
        </div>

        {hoursLeft !== null && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <span className="text-sm">⏳</span>
            <p className="text-xs text-amber-700">
              Link berlaku{" "}
              <span className="font-semibold">{hoursLeft} jam lagi</span>
            </p>
          </div>
        )}

        <ActivateForm token={token} email={account.email} />
      </div>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center">
          <p className="font-semibold text-gray-800 text-sm">Hongjoo Store</p>
        </div>
      </header>
      <div className="max-w-md mx-auto px-4 py-8">{children}</div>
    </div>
  );
}

function StatusCard({
  icon,
  iconBg,
  iconColor,
  title,
  titleColor,
  children,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  titleColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div
        className={`w-14 h-14 ${iconBg} rounded-full flex items-center justify-center`}
      >
        <span className={`text-2xl font-bold ${iconColor}`}>{icon}</span>
      </div>
      <h1 className={`text-xl font-bold ${titleColor}`}>{title}</h1>
      {children}
    </div>
  );
}
