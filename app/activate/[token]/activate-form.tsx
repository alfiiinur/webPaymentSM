"use client";

import { useState } from "react";
import Link from "next/link";

interface ActivateFormProps {
  token: string;
  email: string;
}

export function ActivateForm({ token, email }: ActivateFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function getStrength(pw: string) {
    if (pw.length === 0)
      return { label: "", color: "bg-gray-200", width: "w-0" };
    if (pw.length < 8)
      return { label: "Terlalu pendek", color: "bg-red-400", width: "w-1/4" };
    if (pw.length < 12 && !/[A-Z]/.test(pw))
      return { label: "Lemah", color: "bg-orange-400", width: "w-2/4" };
    if (pw.length >= 12 && /[A-Z]/.test(pw) && /[0-9]/.test(pw))
      return { label: "Kuat", color: "bg-green-500", width: "w-full" };
    return { label: "Sedang", color: "bg-yellow-400", width: "w-3/4" };
  }

  const strength = getStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password dan konfirmasi tidak sama.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Show specific error
        const msg =
          data.details?.confirmPassword?.[0] ??
          data.details?.password?.[0] ??
          data.error ??
          "Gagal mengaktifkan akun.";
        setError(msg);
        return;
      }

      // Success — show success state, user manually clicks to dashboard
      setSuccess(true);
    } catch {
      setError("Gagal terhubung ke server. Periksa koneksi kamu.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-5 py-4">
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
          <h2 className="text-xl font-bold text-gray-900">
            Akun Berhasil Diaktifkan!
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            <span className="font-medium text-gray-700">{email}</span> sudah
            aktif.
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left space-y-1">
          <p className="text-sm font-medium text-blue-800">Selanjutnya:</p>
          <p className="text-xs text-blue-700">
            Login ke dashboard untuk melihat produk dan akun digital yang kamu
            beli.
          </p>
        </div>
        {/* Hard navigate — bukan router.push agar tidak ada issue hydration */}
        <a
          href="/dashboard/login"
          className="block w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors text-center"
        >
          Masuk ke Dashboard →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Email info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0 text-sm">
          ✉️
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">
            Email Akun
          </p>
          <p className="text-sm text-gray-800 font-medium">{email}</p>
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-600">
          Password Baru <span className="text-red-400">*</span>
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimal 8 karakter"
          required
          autoComplete="new-password"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100 transition-all"
        />
        {password.length > 0 && (
          <div className="space-y-1">
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${strength.color} ${strength.width}`}
              />
            </div>
            <p className="text-[11px] text-gray-500">
              {strength.label} · {password.length} karakter
            </p>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-600">
          Konfirmasi Password <span className="text-red-400">*</span>
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Ulangi password"
          required
          autoComplete="new-password"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100 transition-all"
        />
        {confirmPassword.length > 0 && (
          <p
            className={`text-[11px] ${password === confirmPassword ? "text-green-600" : "text-red-500"}`}
          >
            {password === confirmPassword
              ? `✓ Password cocok`
              : `✗ Tidak sama (${password.length} vs ${confirmPassword.length} karakter)`}
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          {error.includes("kadaluarsa") || error.includes("tidak valid") ? (
            <p className="text-xs text-red-500 mt-1">
              Kembali ke halaman receipt dan klik ulang tombol Aktifkan Akun,
              atau hubungi admin.
            </p>
          ) : null}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Mengaktifkan...
          </span>
        ) : (
          "Aktifkan Akun"
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        Sudah punya akun?{" "}
        <Link
          href="/dashboard/login"
          className="text-gray-600 underline underline-offset-2"
        >
          Login ke Dashboard
        </Link>
      </p>
    </form>
  );
}
