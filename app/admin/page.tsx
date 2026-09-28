"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Shield,
  Crown,
  Sparkles,
  AlertTriangle,
  Search,
  RefreshCw,
  ArrowLeft,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  Trash2,
  UserCheck,
  UserX,
  X,
  Receipt,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-hooks";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  isDemo: boolean;
  googleId: string | null;
  avatarUrl: string | null;
  createdAt: string;
  calculatedStatus: "PRO" | "TRIAL" | "EXPIRED" | "DEMO";
  daysLeft: number;
  _count: {
    transactions: number;
    receiptScans: number;
  };
}

interface Metrics {
  totalRealUsers: number;
  totalDemoUsers: number;
  totalPro: number;
  totalTrial: number;
  totalExpired: number;
  totalGoogle: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();

  const [metrics, setMetrics] = useState<Metrics>({
    totalRealUsers: 0,
    totalDemoUsers: 0,
    totalPro: 0,
    totalTrial: 0,
    totalExpired: 0,
    totalGoogle: 0,
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form actions
  const [proMonths, setProMonths] = useState(1);
  const [trialDays, setTrialDays] = useState(7);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&filter=${filter}`);
      if (res.status === 403) {
        toast.error("Akses khusus Administrator!");
        router.push("/");
        return;
      }
      if (!res.ok) throw new Error("Gagal mengambil data pengguna");

      const data = await res.json();
      setMetrics(data.metrics);
      setUsers(data.users);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [search, filter, router]);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser || currentUser.role !== "ADMIN") {
        toast.error("Halaman ini hanya untuk Administrator");
        router.push("/");
        return;
      }
      fetchUsers();
    }
  }, [currentUser, authLoading, fetchUsers, router]);

  const handleUpdatePlan = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui");

      toast.success(data.message || "Berhasil diperbarui");
      setSelectedUser(null);
      fetchUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Hapus pengguna ${email}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");

      toast.success("Pengguna berhasil dihapus");
      if (selectedUser?.id === id) setSelectedUser(null);
      fetchUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted animate-pulse">Memverifikasi hak akses admin…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-20 pt-6 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground font-medium transition"
            >
              <ArrowLeft className="size-3.5" /> Kembali ke Aplikasi
            </Link>
            <span className="text-muted">•</span>
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <Shield className="size-3" /> ADMINISTRATOR
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Panel Pengelolaan Pengguna</h1>
          <p className="text-sm text-muted">
            Pantau jumlah pendaftar, status pembayaran PRO, masa coba trial, dan akun demo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
        {/* Card 1: Total Real Users */}
        <div className="bg-card border border-line rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Pendaftar Asli</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold">{metrics.totalRealUsers}</span>
            <p className="text-[11px] text-muted mt-0.5">
              {metrics.totalGoogle} via Akun Google
            </p>
          </div>
        </div>

        {/* Card 2: PRO / Berbayar */}
        <div className="bg-card border border-line rounded-xl p-4 shadow-sm flex flex-col justify-between border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Berbayar (PRO)</span>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600">
              <Crown className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.totalPro}</span>
            <p className="text-[11px] text-muted mt-0.5">Langganan Aktif</p>
          </div>
        </div>

        {/* Card 3: Trial Aktif */}
        <div className="bg-card border border-line rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Trial Aktif</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
              <Sparkles className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold">{metrics.totalTrial}</span>
            <p className="text-[11px] text-muted mt-0.5">Masa coba gratis 3 hari</p>
          </div>
        </div>

        {/* Card 4: Expired / Free */}
        <div className="bg-card border border-line rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Habis / Free</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-rose-600">{metrics.totalExpired}</span>
            <p className="text-[11px] text-muted mt-0.5">Perlu diperpanjang</p>
          </div>
        </div>

        {/* Card 5: Demo Users */}
        <div className="bg-card border border-line rounded-xl p-4 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Akun Demo</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold">{metrics.totalDemoUsers}</span>
            <p className="text-[11px] text-muted mt-0.5">Tamu coba-coba</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-line rounded-xl p-4 shadow-sm mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs Filter */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-xs">
            {[
              { id: "all", label: "Semua" },
              { id: "real", label: "Pendaftar Asli" },
              { id: "pro", label: "Berbayar (PRO)" },
              { id: "trial", label: "Masa Trial" },
              { id: "expired", label: "Expired" },
              { id: "demo", label: "Demo" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                  filter === t.id
                    ? "bg-brand text-white shadow-sm"
                    : "text-muted hover:text-foreground hover:bg-accent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email…"
              className="pl-9 text-xs h-9"
            />
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-card border border-line rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-line text-muted uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Status Langganan</th>
                <th className="px-4 py-3">Aktivitas Data</th>
                <th className="px-4 py-3">Tanggal Daftar</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    Memuat data pengguna…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    Tidak ada pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-accent/40 transition">
                    {/* User Column */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt=""
                            className="size-8 rounded-full border border-line object-cover"
                          />
                        ) : (
                          <div className="size-8 rounded-full bg-accent flex items-center justify-center font-bold text-muted">
                            {(u.name?.[0] || u.email[0]).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate max-w-[180px] sm:max-w-xs">
                            {u.isDemo ? "Demo User" : (u.name || "Tanpa Nama")}
                          </p>
                          <div className="flex items-center gap-1.5 text-muted text-[11px] truncate max-w-[200px] sm:max-w-xs">
                            {u.isDemo ? (
                              <span className="text-amber-600 dark:text-amber-400">Akun Tamu (Demo)</span>
                            ) : (
                              <span>{u.email}</span>
                            )}
                            {u.googleId && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-blue-500/10 px-1 py-0.2 text-[9px] font-semibold text-blue-600">
                                Google
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status Column */}
                    <td className="px-4 py-3.5">
                      {u.calculatedStatus === "PRO" && (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 w-fit rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                            <Crown className="size-3" /> PRO AKTIF
                          </span>
                          <span className="text-[10px] text-muted">
                            {u.daysLeft} hari lagi ({u.subscriptionEndsAt ? new Date(u.subscriptionEndsAt).toLocaleDateString("id-ID") : "-"})
                          </span>
                        </div>
                      )}
                      {u.calculatedStatus === "TRIAL" && (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 w-fit rounded-full bg-blue-100 dark:bg-blue-950/40 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400">
                            <Sparkles className="size-3" /> TRIAL GRATIS
                          </span>
                          <span className="text-[10px] text-muted">
                            {u.daysLeft} hari tersisa
                          </span>
                        </div>
                      )}
                      {u.calculatedStatus === "EXPIRED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950/40 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400">
                          <AlertTriangle className="size-3" /> EXPIRED / FREE
                        </span>
                      )}
                      {u.calculatedStatus === "DEMO" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/40 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                          <Clock className="size-3" /> DEMO
                        </span>
                      )}
                    </td>

                    {/* Data Activity */}
                    <td className="px-4 py-3.5 text-muted">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1" title="Transaksi dicatat">
                          <ArrowLeftRight className="size-3 text-muted" /> {u._count.transactions} tx
                        </span>
                        <span className="inline-flex items-center gap-1" title="Struk di-scan">
                          <Receipt className="size-3 text-muted" /> {u._count.receiptScans} struk
                        </span>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-3.5 text-muted">
                      {new Date(u.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      {u.role === "ADMIN" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                          <Shield className="size-3" /> ADMIN
                        </span>
                      ) : (
                        <span className="text-muted text-[11px]">User</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(u)}
                        className="h-7 text-xs px-2.5"
                      >
                        Kelola
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Dialog Kelola Pengguna */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0">
          <div className="bg-card border border-line rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Crown className="size-5 text-brand" />
                <h3 className="font-bold text-base">Kelola Status Pengguna</h3>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Info Pengguna */}
              <div className="bg-muted/40 rounded-xl p-3 border border-line text-xs">
                <p className="font-bold text-sm text-foreground">
                  {selectedUser.name || "Tanpa Nama"}
                </p>
                <p className="text-muted">{selectedUser.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-medium">Status Sekarang:</span>
                  <span className="font-bold">{selectedUser.calculatedStatus}</span>
                  {selectedUser.daysLeft > 0 && <span>({selectedUser.daysLeft} hari)</span>}
                </div>
              </div>

              {/* Aksi 1: Aktifkan PRO Berbayar */}
              <div className="border border-line rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="size-4" /> Aktifkan Status PRO (Berbayar)
                  </span>
                </div>
                <p className="text-[11px] text-muted">
                  Gunakan ini jika user membayar transfer manual, hadiah, atau konfirmasi offline.
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={proMonths}
                    onChange={(e) => setProMonths(Number(e.target.value))}
                    className="flex-1 rounded-lg border border-line bg-background px-3 py-1.5 text-xs"
                  >
                    <option value={1}>1 Bulan Langganan</option>
                    <option value={3}>3 Bulan Langganan</option>
                    <option value={6}>6 Bulan Langganan</option>
                    <option value={12}>1 Tahun (12 Bulan)</option>
                  </select>
                  <Button
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => handleUpdatePlan("ACTIVATE_PRO", { durationMonths: proMonths })}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  >
                    Aktifkan PRO
                  </Button>
                </div>
              </div>

              {/* Aksi 2: Tambah Masa Trial */}
              <div className="border border-line rounded-xl p-3.5 space-y-2.5">
                <span className="text-xs font-bold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Sparkles className="size-4" /> Perpanjang Masa Trial Gratis
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={trialDays}
                    onChange={(e) => setTrialDays(Number(e.target.value))}
                    className="flex-1 rounded-lg border border-line bg-background px-3 py-1.5 text-xs"
                  >
                    <option value={7}>+7 Hari Tambahan</option>
                    <option value={14}>+14 Hari Tambahan</option>
                    <option value={30}>+30 Hari Tambahan</option>
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => handleUpdatePlan("EXTEND_TRIAL", { extendDays: trialDays })}
                    className="text-xs"
                  >
                    Tambah Hari
                  </Button>
                </div>
              </div>

              {/* Aksi 3: Set Free / Expired */}
              <div className="flex items-center justify-between pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionLoading}
                  onClick={() => handleUpdatePlan("SET_FREE")}
                  className="text-rose-600 hover:bg-rose-50 text-xs"
                >
                  Kembalikan ke Expired / Free
                </Button>

                {/* Aksi 4: Ubah Role Admin */}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionLoading}
                  onClick={() =>
                    handleUpdatePlan("TOGGLE_ROLE", {
                      newRole: selectedUser.role === "ADMIN" ? "USER" : "ADMIN",
                    })
                  }
                  className="text-purple-600 hover:bg-purple-50 text-xs"
                >
                  {selectedUser.role === "ADMIN" ? "Cabut Hak Admin" : "Jadikan Admin"}
                </Button>
              </div>

              {/* Aksi 5: Hapus User */}
              <div className="pt-2 border-t border-line flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)}
                  className="text-muted hover:text-rose-600 text-xs gap-1"
                >
                  <Trash2 className="size-3.5" /> Hapus Pengguna
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
