"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProductOption = {
  id: string;
  name: string;
  packageType: string;
  store: { name: string };
};

type ProductAccessUser = {
  id: string;
  grantedAt: string | Date;
  hasWarranty: boolean;
  account: { email: string };
};

type Credential = {
  id: string;
  productId: string;
  email: string;
  password: string;
  notes: string | null;
  status: "AVAILABLE" | "USED" | "INACTIVE";
  maxSlots: number;
  usedSlots: number;
  hasWarranty: boolean;
  assignedAt: string | Date | null;
  createdAt: string | Date;
  product: {
    id: string;
    name: string;
    packageType: string;
    store: { name: string };
  };
  productAccess: ProductAccessUser[];
};

type Props = { initialCredentials: Credential[]; products: ProductOption[] };

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "bg-green-100  text-green-700",
  USED: "bg-blue-100   text-blue-700",
  INACTIVE: "bg-gray-100   text-gray-500",
};
const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Tersedia",
  USED: "Penuh",
  INACTIVE: "Nonaktif",
};

function formatDate(d: string | Date) {
  return new Date(d).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const emptyForm = {
  productId: "",
  email: "",
  password: "",
  notes: "",
  maxSlots: "1",
  hasWarranty: false,
};
const emptyReplace = { email: "", password: "", notes: "", reason: "" };

export default function CredentialsClient({
  initialCredentials,
  products,
}: Props) {
  const router = useRouter();
  const [creds, setCreds] = useState<Credential[]>(initialCredentials);
  const [showForm, setShowForm] = useState(false);
  const [editCred, setEditCred] = useState<Credential | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showPass, setShowPass] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [filterProduct, setFilterProduct] = useState<string>("all");

  // Replace modal state
  const [replaceModal, setReplaceModal] = useState<{
    credentialId: string;
    accessId: string;
    userEmail: string;
  } | null>(null);
  const [replaceForm, setReplaceForm] = useState(emptyReplace);
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replaceError, setReplaceError] = useState("");

  const filtered = creds.filter((c) => {
    const matchStatus = filter === "all" || c.status === filter;
    const matchProduct =
      filterProduct === "all" || c.productId === filterProduct;
    return matchStatus && matchProduct;
  });

  const stats = {
    total: creds.length,
    totalSlots: creds.reduce((s, c) => s + c.maxSlots, 0),
    usedSlots: creds.reduce((s, c) => s + c.usedSlots, 0),
    available: creds.filter((c) => c.status === "AVAILABLE").length,
    withWarranty: creds.reduce(
      (s, c) => s + c.productAccess.filter((pa) => pa.hasWarranty).length,
      0,
    ),
  };

  function openCreate() {
    setEditCred(null);
    setForm({ ...emptyForm, productId: products[0]?.id ?? "" });
    setError("");
    setShowForm(true);
  }

  function openEdit(c: Credential) {
    setEditCred(c);
    setForm({
      productId: c.productId,
      email: c.email,
      password: c.password,
      notes: c.notes ?? "",
      maxSlots: String(c.maxSlots),
      hasWarranty: c.hasWarranty,
    });
    setError("");
    setShowForm(true);
  }

  function openReplace(c: Credential, pa: ProductAccessUser) {
    setReplaceModal({
      credentialId: c.id,
      accessId: pa.id,
      userEmail: pa.account.email,
    });
    setReplaceForm({
      ...emptyReplace,
      email: c.email,
      password: "",
      notes: c.notes ?? "",
    });
    setReplaceError("");
  }

  async function refreshList() {
    const res = await fetch("/api/admin/credentials");
    const data = await res.json();
    setCreds(data.credentials);
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        maxSlots: parseInt(form.maxSlots, 10) || 1,
        notes: form.notes || undefined,
      };
      const res = editCred
        ? await fetch(`/api/admin/credentials/${editCred.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/credentials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan");
        return;
      }
      setShowForm(false);
      router.refresh();
      await refreshList();
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function handleReplace() {
    if (!replaceModal) return;
    setReplaceError("");
    setReplaceLoading(true);
    try {
      const res = await fetch(
        `/api/admin/credentials/${replaceModal.credentialId}/replace`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productAccessId: replaceModal.accessId,
            newEmail: replaceForm.email,
            newPassword: replaceForm.password,
            newNotes: replaceForm.notes || undefined,
            reason: replaceForm.reason || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setReplaceError(data.error ?? "Gagal mengganti credential");
        return;
      }
      setReplaceModal(null);
      await refreshList();
    } catch {
      setReplaceError("Terjadi kesalahan");
    } finally {
      setReplaceLoading(false);
    }
  }

  async function handleDelete(c: Credential) {
    if (
      !confirm(
        c.usedSlots > 0
          ? `Credential "${c.email}" sudah dipakai ${c.usedSlots} user. Akan dinonaktifkan. Lanjut?`
          : `Hapus credential "${c.email}"?`,
      )
    )
      return;
    const res = await fetch(`/api/admin/credentials/${c.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Gagal");
      return;
    }
    await refreshList();
  }

  async function toggleStatus(c: Credential) {
    const newStatus = c.status === "INACTIVE" ? "AVAILABLE" : "INACTIVE";
    await fetch(`/api/admin/credentials/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await refreshList();
  }

  async function toggleWarranty(c: Credential) {
    await fetch(`/api/admin/credentials/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasWarranty: !c.hasWarranty }),
    });
    await refreshList();
  }

  async function toggleUserWarranty(
    credentialId: string,
    pa: ProductAccessUser,
  ) {
    await fetch(`/api/admin/credentials/${credentialId}/access/${pa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasWarranty: !pa.hasWarranty }),
    });
    await refreshList();
  }

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Credentials</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Akun digital yang dijual — termasuk manajemen garansi
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Tambah Credential
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Akun", value: stats.total, color: "" },
          {
            label: "Slot Terpakai",
            value: `${stats.usedSlots}/${stats.totalSlots}`,
            color:
              stats.usedSlots >= stats.totalSlots && stats.totalSlots > 0
                ? "text-red-500"
                : "text-green-600",
          },
          {
            label: "Akun Tersedia",
            value: stats.available,
            color: "text-green-600",
          },
          {
            label: "Pemakai Bergaransi",
            value: stats.withWarranty,
            color: "text-amber-600",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="border border-border rounded-xl p-3 bg-card text-center"
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none"
        >
          <option value="all">Semua Produk</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.store.name} — {p.name} {p.packageType}
            </option>
          ))}
        </select>
        <div className="flex gap-2 text-sm">
          {["all", "AVAILABLE", "USED", "INACTIVE"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}
            >
              {s === "all" ? "Semua" : (STATUS_LABEL[s] ?? s)}
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
                Produk
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Email / Password
              </th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                Slot
              </th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Pemakai
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
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Belum ada credential.
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="border-b border-border last:border-0 hover:bg-muted/20 align-top"
              >
                <td className="px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    {c.product.store.name}
                  </p>
                  <p className="font-medium">
                    {c.product.name}{" "}
                    <span className="text-muted-foreground">
                      {c.product.packageType}
                    </span>
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-mono text-xs">{c.email}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-xs text-muted-foreground">
                      {showPass === c.id ? c.password : "••••••••"}
                    </span>
                    <button
                      onClick={() =>
                        setShowPass(showPass === c.id ? null : c.id)
                      }
                      className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    >
                      {showPass === c.id ? "hide" : "show"}
                    </button>
                  </div>
                  {c.notes && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {c.notes}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-semibold">
                    {c.usedSlots}/{c.maxSlots}
                  </span>
                  <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden mx-auto mt-1">
                    <div
                      className={`h-full rounded-full ${c.usedSlots >= c.maxSlots ? "bg-red-500" : c.usedSlots > 0 ? "bg-amber-400" : "bg-green-500"}`}
                      style={{
                        width: `${Math.min(100, (c.usedSlots / c.maxSlots) * 100)}%`,
                      }}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status]}`}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
                {/* Users list with per-user warranty toggle + replace button */}
                <td className="px-4 py-3 text-xs min-w-[200px]">
                  {c.productAccess.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="space-y-2">
                      {c.productAccess.map((pa) => (
                        <div
                          key={pa.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              {pa.hasWarranty && (
                                <span
                                  title="Garansi aktif"
                                  className="text-amber-500 text-xs leading-none"
                                >
                                  🛡️
                                </span>
                              )}
                              <p className="text-gray-700 dark:text-gray-300 truncate">
                                {pa.account.email}
                              </p>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {formatDate(pa.grantedAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Toggle garansi per user */}
                            <button
                              onClick={() => toggleUserWarranty(c.id, pa)}
                              title={
                                pa.hasWarranty
                                  ? "Nonaktifkan garansi user ini"
                                  : "Aktifkan garansi untuk user ini"
                              }
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                                pa.hasWarranty
                                  ? "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400"
                                  : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500"
                              }`}
                            >
                              {pa.hasWarranty ? "🛡️ Guard" : "Guard"}
                            </button>
                            {/* Tombol ganti credential — hanya muncul jika user ini punya garansi */}
                            {pa.hasWarranty && (
                              <button
                                onClick={() => openReplace(c, pa)}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400 transition-colors"
                              >
                                Ganti
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => openEdit(c)}
                      className="px-2.5 py-1 rounded-md text-xs border border-border hover:bg-accent transition-colors"
                    >
                      Edit
                    </button>
                    {c.status !== "USED" && (
                      <button
                        onClick={() => toggleStatus(c)}
                        className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${c.status === "INACTIVE" ? "border-green-500/30 text-green-600 hover:bg-green-50" : "border-yellow-500/30 text-yellow-600 hover:bg-yellow-50"}`}
                      >
                        {c.status === "INACTIVE" ? "Aktifkan" : "Nonaktifkan"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(c)}
                      className="px-2.5 py-1 rounded-md text-xs border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Modal Tambah/Edit ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-semibold mb-4">
              {editCred ? "Edit Credential" : "Tambah Credential"}
            </h2>
            <div className="space-y-4">
              {!editCred && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Produk
                  </label>
                  <select
                    value={form.productId}
                    onChange={(e) =>
                      setForm({ ...form, productId: e.target.value })
                    }
                    className={inputCls}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.store.name} — {p.name} {p.packageType}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Email Akun Digital
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                  placeholder="user@netflix.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Password Akun Digital
                </label>
                <input
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Maks Slot{" "}
                  <span className="text-muted-foreground font-normal text-xs">
                    (berapa user bisa pakai akun ini)
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.maxSlots}
                  onChange={(e) =>
                    setForm({ ...form, maxSlots: e.target.value })
                  }
                  className={inputCls}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Netflix Basic=1 · Standard=2 · Premium=4
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="warranty"
                  checked={form.hasWarranty}
                  onChange={(e) =>
                    setForm({ ...form, hasWarranty: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="warranty" className="text-sm">
                  🛡️ Aktifkan Garansi
                  <span className="block text-xs text-muted-foreground font-normal">
                    Jika akun bermasalah, admin bisa ganti credential tanpa user
                    perlu WA ulang
                  </span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Catatan{" "}
                  <span className="text-muted-foreground font-normal">
                    (opsional)
                  </span>
                </label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={inputCls}
                  placeholder="PIN: 1234 · dll"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Ganti Credential (Garansi) ─────────────────────────────── */}
      {replaceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl">
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🛡️</span>
                <h2 className="text-lg font-semibold">
                  Ganti Credential (Garansi)
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Mengganti credential untuk user{" "}
                <span className="font-medium text-foreground">
                  {replaceModal.userEmail}
                </span>
                . Credential lama akan dinonaktifkan secara otomatis.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Email Akun Baru <span className="text-red-400">*</span>
                </label>
                <input
                  value={replaceForm.email}
                  onChange={(e) =>
                    setReplaceForm({ ...replaceForm, email: e.target.value })
                  }
                  className={inputCls}
                  placeholder="user@netflix.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Password Akun Baru <span className="text-red-400">*</span>
                </label>
                <input
                  value={replaceForm.password}
                  onChange={(e) =>
                    setReplaceForm({ ...replaceForm, password: e.target.value })
                  }
                  className={inputCls}
                  placeholder="password baru"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Catatan{" "}
                  <span className="text-muted-foreground font-normal">
                    (opsional)
                  </span>
                </label>
                <input
                  value={replaceForm.notes}
                  onChange={(e) =>
                    setReplaceForm({ ...replaceForm, notes: e.target.value })
                  }
                  className={inputCls}
                  placeholder="PIN: 1234 · dll"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Alasan Penggantian{" "}
                  <span className="text-muted-foreground font-normal">
                    (opsional, untuk log)
                  </span>
                </label>
                <input
                  value={replaceForm.reason}
                  onChange={(e) =>
                    setReplaceForm({ ...replaceForm, reason: e.target.value })
                  }
                  className={inputCls}
                  placeholder="Akun bermasalah / banned / dll"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                ⚠️ Setelah disimpan, user akan langsung melihat credential baru
                di dashboard mereka. Credential lama akan dinonaktifkan.
              </div>
              {replaceError && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {replaceError}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setReplaceModal(null)}
                  className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleReplace}
                  disabled={
                    replaceLoading ||
                    !replaceForm.email ||
                    !replaceForm.password
                  }
                  className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {replaceLoading ? "Memproses..." : "Ganti Credential"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
