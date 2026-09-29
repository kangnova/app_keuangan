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
  ExternalLink,
  CreditCard,
  CheckCircle,
  Clock,
  Trash2,
  X,
  Receipt,
  ArrowLeftRight,
  Settings,
  BrainCircuit,
  KeyRound,
  FlaskConical,
  RotateCcw,
  LogOut,
  Mail,
  ChevronRight,
  Layers,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Label } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-hooks";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";

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

type SettingSource = "db" | "env" | "default";
type ModelOption = { value: string; label: string };

type SettingsPayload = {
  vision: { value: string; source: SettingSource; overridden: boolean; options: ModelOption[] };
  mock: { enabled: boolean; source: SettingSource };
  apiKeySet: boolean;
};

const SOURCE_LABEL: Record<SettingSource, string> = {
  db: "diatur dari panel ini",
  env: "dari file .env",
  default: "bawaan aplikasi",
};

type ServerStatus = {
  uptime: number;
  systemUptime: number;
  pid: number;
  node: string;
  appVersion: string;
  env: string;
  platform: string;
  hostname: string;
  cpus: number;
  totalMem: number;
  freeMem: number;
  heapUsed: number;
  rss: number;
  db: string;
  time: string;
};

function fmtDuration(s: number): string {
  if (!isFinite(s) || s < 0) return "—";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (d > 0) return `${d} hari ${h} jam`;
  if (h > 0) return `${h} jam ${m} menit`;
  if (m > 0) return `${m} menit ${sec} detik`;
  return `${sec} detik`;
}

function fmtMB(b: number): string {
  return `${(b / 1024 / 1024).toFixed(0)} MB`;
}

function fmtGB(b: number): string {
  return `${(b / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-muted/20 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading, refresh } = useAuth();

  // Navigation tab in Admin
  const [activeTab, setActiveTab] = useState<"users" | "settings">("users");

  // Users & Metrics state
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

  // AI & Server Settings state
  const [settingsData, setSettingsData] = useState<SettingsPayload | null>(null);
  const [visionModel, setVisionModel] = useState("");
  const [mockEnabled, setMockEnabled] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [serverLoading, setServerLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&filter=${filter}`);
      if (res.status === 403) {
        toast.error("Akses ditolak: Khusus Administrator!");
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

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const raw = await res.json();
        const d: SettingsPayload = raw.data ?? raw;
        setSettingsData(d);
        setVisionModel(d.vision.value);
        setMockEnabled(d.mock.enabled);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadServerStatus = useCallback(async () => {
    setServerLoading(true);
    try {
      const res = await fetch("/api/admin/server-status");
      if (res.ok) {
        const raw = await res.json();
        setServerStatus(raw.data ?? raw);
      }
    } catch {
      // ignore
    } finally {
      setServerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser || currentUser.role !== "ADMIN") {
        toast.error("Halaman ini hanya dapat diakses oleh Administrator");
        router.push("/");
        return;
      }
      fetchUsers();
      loadSettings();
      loadServerStatus();
    }
  }, [currentUser, authLoading, fetchUsers, loadSettings, loadServerStatus, router]);

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

  const handleSaveSettings = async (next: { visionModel?: string; mockMode?: boolean }) => {
    setSettingsSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (next.visionModel !== undefined) body.visionModel = next.visionModel || null;
      if (next.mockMode !== undefined) body.mockMode = next.mockMode;

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Gagal menyimpan pengaturan");

      toast.success("Pengaturan AI & Server berhasil disimpan");
      await loadSettings();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSettingsSaving(false);
    }
  };

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Berhasil keluar");
      refresh();
      router.push("/");
    } catch {
      toast.error("Gagal keluar");
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted animate-pulse text-sm">Memverifikasi kredensial Administrator…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950/20 flex flex-col">
      {/* ================= DESKTOP ADMIN TOPBAR ================= */}
      <header className="sticky top-0 z-40 w-full border-b border-line bg-card/95 backdrop-blur px-6 lg:px-10 h-16 flex items-center justify-between">
        {/* Brand & Mode */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-brand to-emerald-400 flex items-center justify-center text-white shadow-md shadow-brand/20">
              <Shield className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight">Duitku Admin Console</span>
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  DESKTOP PRO
                </span>
              </div>
              <p className="text-[10px] text-muted -mt-0.5">Pusat Kendali Pengguna, Langganan, dan AI</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 ml-4 border-l border-line pl-6">
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "users"
                  ? "bg-brand text-white shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-accent"
              }`}
            >
              <Users className="size-3.5" />
              <span>Kelola Pengguna ({metrics.totalRealUsers})</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "settings"
                  ? "bg-brand text-white shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-accent"
              }`}
            >
              <Settings className="size-3.5" />
              <span>Konfigurasi AI & Server</span>
            </button>
          </nav>
        </div>

        {/* Right Admin Profile & Quick Links */}
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <Link
            href="/"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-line bg-background px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-accent transition"
          >
            <ExternalLink className="size-3.5" />
            <span>Buka Aplikasi Web</span>
          </Link>

          <div className="h-6 w-px bg-line hidden sm:block" />

          {/* Admin User Badge */}
          <div className="flex items-center gap-2.5 bg-accent/50 border border-line rounded-lg px-2.5 py-1">
            <div className="size-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
              {currentUser?.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-xs font-semibold leading-none">{currentUser?.name || "Admin"}</p>
              <p className="text-[10px] text-muted">{currentUser?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Keluar"
            className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* ================= MAIN DESKTOP WORKSPACE ================= */}
      <main className="flex-1 w-full px-6 lg:px-10 py-6 max-w-[1600px] mx-auto">
        {/* ================= TAB 1: PENGGUNA & LANGGANAN ================= */}
        {activeTab === "users" && (
          <div className="space-y-6 animate-in fade-in-0 duration-200">
            {/* Top Metrics Row (5 Cards) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Card 1 */}
              <div className="bg-card border border-line rounded-xl p-4 shadow-sm hover:border-blue-500/40 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">Total Pendaftar Asli</span>
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <Users className="size-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold tracking-tight">{metrics.totalRealUsers}</span>
                  <p className="text-[11px] text-muted mt-1 flex items-center gap-1">
                    <span className="font-semibold text-blue-600">{metrics.totalGoogle}</span> via Google OAuth
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-card border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-4 shadow-sm hover:border-emerald-500/60 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Berbayar (PRO)</span>
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600">
                    <Crown className="size-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                    {metrics.totalPro}
                  </span>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                    Pelanggan Aktif Membayar
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-card border border-line rounded-xl p-4 shadow-sm hover:border-indigo-500/40 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">Trial Aktif</span>
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                    <Sparkles className="size-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
                    {metrics.totalTrial}
                  </span>
                  <p className="text-[11px] text-muted mt-1">Masa Coba Gratis 3 Hari</p>
                </div>
              </div>

              {/* Card 4 */}
              <div className="bg-card border border-line rounded-xl p-4 shadow-sm hover:border-rose-500/40 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">Habis / Expired</span>
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
                    <AlertTriangle className="size-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold tracking-tight text-rose-600">{metrics.totalExpired}</span>
                  <p className="text-[11px] text-muted mt-1">Perlu Perpanjangan PRO</p>
                </div>
              </div>

              {/* Card 5 */}
              <div className="bg-card border border-line rounded-xl p-4 shadow-sm hover:border-amber-500/40 transition col-span-2 md:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">Akun Demo (Tamu)</span>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                    <Clock className="size-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold tracking-tight text-amber-600">{metrics.totalDemoUsers}</span>
                  <p className="text-[11px] text-muted mt-1">Sesi Uji Coba Sementara</p>
                </div>
              </div>
            </div>

            {/* Desktop Filter Toolbar & Search */}
            <div className="bg-card border border-line rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs">
                {[
                  { id: "all", label: "Semua", count: users.length },
                  { id: "real", label: "Pendaftar Asli", count: metrics.totalRealUsers },
                  { id: "pro", label: "Berbayar (PRO)", count: metrics.totalPro },
                  { id: "trial", label: "Masa Trial", count: metrics.totalTrial },
                  { id: "expired", label: "Expired", count: metrics.totalExpired },
                  { id: "demo", label: "Demo", count: metrics.totalDemoUsers },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFilter(t.id)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                      filter === t.id
                        ? "bg-brand text-white shadow-sm"
                        : "text-muted hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <span>{t.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        filter === t.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Box & Refresh */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama atau email pengguna…"
                    className="pl-9 h-9 text-xs"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchUsers}
                  disabled={loading}
                  className="h-9 px-3 gap-1.5 text-xs shrink-0"
                >
                  <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Segarkan</span>
                </Button>
              </div>
            </div>

            {/* Full-Width Desktop Table */}
            <div className="bg-card border border-line rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-line text-muted uppercase tracking-wider text-[11px] font-semibold">
                    <tr>
                      <th className="px-6 py-3.5">Pengguna</th>
                      <th className="px-6 py-3.5">Status Langganan</th>
                      <th className="px-6 py-3.5">Masa Berlaku</th>
                      <th className="px-6 py-3.5">Aktivitas Keuangan</th>
                      <th className="px-6 py-3.5">Waktu Daftar</th>
                      <th className="px-6 py-3.5">Hak Akses</th>
                      <th className="px-6 py-3.5 text-right">Tindakan Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {loading && users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center text-muted">
                          <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-brand" />
                          Memuat data pengguna…
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center text-muted">
                          Tidak ada pengguna yang cocok dengan kriteria pencarian / filter.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-accent/40 transition">
                          {/* 1. Pengguna */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {u.avatarUrl ? (
                                <img
                                  src={u.avatarUrl}
                                  alt=""
                                  className="size-9 rounded-full border border-line object-cover"
                                />
                              ) : (
                                <div className="size-9 rounded-full bg-accent border border-line flex items-center justify-center font-bold text-sm text-foreground">
                                  {(u.name?.[0] || u.email[0]).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-sm text-foreground truncate max-w-[220px]">
                                    {u.isDemo ? "Demo User" : (u.name || "Tanpa Nama")}
                                  </p>
                                  {u.googleId && (
                                    <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                      Google
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted truncate max-w-[240px]">
                                  {u.isDemo ? (
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                      Akun Tamu (Demo)
                                    </span>
                                  ) : (
                                    u.email
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* 2. Status Langganan */}
                          <td className="px-6 py-4">
                            {u.calculatedStatus === "PRO" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                <Crown className="size-3.5" /> PRO BERBAYAR
                              </span>
                            )}
                            {u.calculatedStatus === "TRIAL" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-950/50 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-400 border border-blue-500/30">
                                <Sparkles className="size-3.5" /> TRIAL GRATIS
                              </span>
                            )}
                            {u.calculatedStatus === "EXPIRED" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 dark:bg-rose-950/50 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-400 border border-rose-500/30">
                                <AlertTriangle className="size-3.5" /> EXPIRED / FREE
                              </span>
                            )}
                            {u.calculatedStatus === "DEMO" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/50 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                <Clock className="size-3.5" /> DEMO
                              </span>
                            )}
                          </td>

                          {/* 3. Masa Berlaku */}
                          <td className="px-6 py-4 text-xs">
                            {u.calculatedStatus === "PRO" && (
                              <div>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  {u.daysLeft} hari lagi
                                </span>
                                <p className="text-[11px] text-muted">
                                  s/d {u.subscriptionEndsAt ? new Date(u.subscriptionEndsAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                                </p>
                              </div>
                            )}
                            {u.calculatedStatus === "TRIAL" && (
                              <div>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  {u.daysLeft} hari tersisa
                                </span>
                                <p className="text-[11px] text-muted">
                                  s/d {u.trialEndsAt ? new Date(u.trialEndsAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                                </p>
                              </div>
                            )}
                            {u.calculatedStatus === "EXPIRED" && (
                              <span className="text-muted">Masa aktif telah habis</span>
                            )}
                            {u.calculatedStatus === "DEMO" && (
                              <span className="text-muted">Maksimal 3 hari coba</span>
                            )}
                          </td>

                          {/* 4. Aktivitas */}
                          <td className="px-6 py-4 text-xs text-muted">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex items-center gap-1 bg-accent/60 px-2 py-1 rounded" title="Total Transaksi">
                                <ArrowLeftRight className="size-3 text-muted" />
                                <span className="font-semibold text-foreground">{u._count.transactions}</span> tx
                              </span>
                              <span className="inline-flex items-center gap-1 bg-accent/60 px-2 py-1 rounded" title="Total Struk Di-scan">
                                <Receipt className="size-3 text-muted" />
                                <span className="font-semibold text-foreground">{u._count.receiptScans}</span> struk
                              </span>
                            </div>
                          </td>

                          {/* 5. Waktu Daftar */}
                          <td className="px-6 py-4 text-xs text-muted">
                            {new Date(u.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </td>

                          {/* 6. Hak Akses (Role) */}
                          <td className="px-6 py-4">
                            {u.role === "ADMIN" ? (
                              <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-600 dark:text-purple-400 border border-purple-500/30">
                                <Shield className="size-3.5" /> ADMIN
                              </span>
                            ) : (
                              <span className="text-muted text-xs">User</span>
                            )}
                          </td>

                          {/* 7. Action Button */}
                          <td className="px-6 py-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUser(u)}
                              className="h-8 px-3 text-xs font-semibold gap-1 hover:bg-brand hover:text-white transition"
                            >
                              <span>Kelola</span>
                              <ChevronRight className="size-3" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: KONFIGURASI AI & SERVER ================= */}
        {activeTab === "settings" && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-0 duration-200">
            <div className="bg-card border border-line rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-brand/10 text-brand">
                  <BrainCircuit className="size-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Konfigurasi Mesin AI & Server</h2>
                  <p className="text-xs text-muted">
                    Atur model kecerdasan buatan untuk membaca struk dan mode pengujian server Duitku.
                  </p>
                </div>
              </div>

              {settingsData && (
                <div className="space-y-6 mt-6">
                  {/* Status API Key */}
                  <div className="flex items-center gap-3.5 p-4 rounded-xl border border-line bg-muted/30">
                    <div
                      className={`p-2.5 rounded-xl ${
                        settingsData.apiKeySet
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      <KeyRound className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">API Key Sumopod AI Gateway</p>
                      <p className="text-xs text-muted mt-0.5">
                        {settingsData.apiKeySet
                          ? "✅ Kunci API aktif dan terpasang di file .env server. Aman dan terisolasi dari client."
                          : "⚠️ SUMOPOD_API_KEY belum terisi di .env. Anda bisa mengaktifkan mode pengujian di bawah."}
                      </p>
                    </div>
                  </div>

                  {/* Model Vision */}
                  <div className="border border-line rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-foreground">Model AI Vision Pembaca Struk</Label>
                      <span className="text-xs text-muted">
                        Sumber aktif: <span className="font-semibold text-foreground">{SOURCE_LABEL[settingsData.vision.source]}</span>
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Pilih model yang akan membaca gambar struk belanja. <span className="font-semibold">gpt-4o-mini</span> sangat direkomendasikan karena cepat, akurat, dan hemat kredit.
                    </p>

                    <div className="flex items-center gap-3 pt-2">
                      <Select
                        value={visionModel}
                        onChange={(e) => setVisionModel(e.target.value)}
                        disabled={settingsSaving}
                        className="max-w-md text-xs h-10"
                      >
                        {settingsData.vision.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>

                      <Button
                        size="sm"
                        disabled={settingsSaving || visionModel === settingsData.vision.value}
                        onClick={() => handleSaveSettings({ visionModel })}
                        className="h-10 text-xs px-4"
                      >
                        Simpan Model
                      </Button>

                      {settingsData.vision.overridden && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={settingsSaving}
                          onClick={() => handleSaveSettings({ visionModel: "" })}
                          className="h-10 text-xs gap-1.5"
                        >
                          <RotateCcw className="size-3.5" /> Reset Default
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Mode Demo / Mock Mode */}
                  <div className="border border-line rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-foreground">Mode Simulasi AI (Mock Mode)</Label>
                      <span className="text-xs text-muted">
                        Sumber aktif: <span className="font-semibold text-foreground">{SOURCE_LABEL[settingsData.mock.source]}</span>
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Saat diaktifkan, scan struk akan memakai data contoh langsung tanpa melakukan panggilan API ke OpenAI/Sumopod (berguna saat pengujian atau jika kuota API habis).
                    </p>

                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-line bg-muted/20 cursor-pointer hover:bg-muted/40 transition">
                      <div className="flex items-center gap-3">
                        <FlaskConical className="size-4 text-brand" />
                        <span className="text-xs font-semibold">Aktifkan Mode Simulasi Dummy</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={mockEnabled}
                        disabled={settingsSaving}
                        onChange={(e) => {
                          setMockEnabled(e.target.checked);
                          handleSaveSettings({ mockMode: e.target.checked });
                        }}
                        className="size-5 accent-[#059669] cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* ===== STATUS SERVER ===== */}
            <div className="bg-card border border-line rounded-xl p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Server className="size-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Status Server</h2>
                    <p className="text-xs text-muted">Informasi runtime server & penggunaan sumber daya.</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadServerStatus}
                  className="text-xs gap-1.5"
                >
                  <RefreshCw className={`size-3.5 ${serverLoading ? "animate-spin" : ""}`} /> Muat Ulang
                </Button>
              </div>

              {serverStatus ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Stat label="Uptime Aplikasi" value={fmtDuration(serverStatus.uptime)} />
                  <Stat label="Uptime Sistem" value={fmtDuration(serverStatus.systemUptime)} />
                  <Stat label="Waktu Server" value={new Date(serverStatus.time).toLocaleTimeString("id-ID")} />
                  <Stat label="Node.js" value={serverStatus.node} />
                  <Stat label="Versi Aplikasi" value={serverStatus.appVersion} />
                  <Stat label="Database" value={serverStatus.db} />
                  <Stat label="Platform" value={serverStatus.platform} />
                  <Stat label="CPU Core" value={`${serverStatus.cpus} core`} />
                  <Stat label="Memori Proses (RSS)" value={fmtMB(serverStatus.rss)} />
                  <Stat
                    label="RAM Sistem (terpakai/total)"
                    value={`${fmtGB(serverStatus.totalMem - serverStatus.freeMem)} / ${fmtGB(serverStatus.totalMem)}`}
                  />
                  <Stat label="Hostname" value={serverStatus.hostname} />
                  <Stat label="PID / Environment" value={`${serverStatus.pid} · ${serverStatus.env}`} />
                </div>
              ) : (
                <p className="text-xs text-muted animate-pulse">Memuat data server…</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL DIALOG KELOLA PENGGUNA ================= */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0">
          <div className="bg-card border border-line rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 space-y-4">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                  <Shield className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Kelola Status Pengguna</h3>
                  <p className="text-[11px] text-muted">Aktivasi manual atau ubah hak akses pengguna</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Profil Ringkas Pengguna */}
            <div className="bg-muted/30 border border-line rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-foreground">
                  {selectedUser.name || "Tanpa Nama"}
                </p>
                <p className="text-xs text-muted">{selectedUser.email}</p>
                <p className="text-[11px] text-muted mt-1">
                  Bergabung: {new Date(selectedUser.createdAt).toLocaleDateString("id-ID")}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted">Status Saat Ini</span>
                <p className="font-extrabold text-sm text-brand">{selectedUser.calculatedStatus}</p>
                {selectedUser.daysLeft > 0 && (
                  <p className="text-[10px] text-muted">{selectedUser.daysLeft} hari tersisa</p>
                )}
              </div>
            </div>

            {/* Aksi 1: Aktifkan PRO Berbayar */}
            <div className="border border-line rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="size-4" /> Berikan / Perpanjang Status PRO
                </span>
              </div>
              <p className="text-[11px] text-muted">
                Pilih durasi paket langganan berbayar (misal pengguna telah membayar transfer manual):
              </p>
              <div className="flex items-center gap-2 pt-1">
                <select
                  value={proMonths}
                  onChange={(e) => setProMonths(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-line bg-background px-3 py-2 text-xs"
                >
                  <option value={1}>1 Bulan Langganan PRO</option>
                  <option value={3}>3 Bulan Langganan PRO</option>
                  <option value={6}>6 Bulan Langganan PRO</option>
                  <option value={12}>1 Tahun Penuh (12 Bulan)</option>
                </select>
                <Button
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => handleUpdatePlan("ACTIVATE_PRO", { durationMonths: proMonths })}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4"
                >
                  Aktifkan PRO
                </Button>
              </div>
            </div>

            {/* Aksi 2: Tambah Masa Trial */}
            <div className="border border-line rounded-xl p-4 space-y-2.5">
              <span className="text-xs font-bold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Sparkles className="size-4" /> Perpanjang Masa Trial Gratis
              </span>
              <div className="flex items-center gap-2 pt-1">
                <select
                  value={trialDays}
                  onChange={(e) => setTrialDays(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-line bg-background px-3 py-2 text-xs"
                >
                  <option value={7}>+7 Hari Masa Coba</option>
                  <option value={14}>+14 Hari Masa Coba</option>
                  <option value={30}>+30 Hari Masa Coba</option>
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => handleUpdatePlan("EXTEND_TRIAL", { extendDays: trialDays })}
                  className="text-xs px-4"
                >
                  Tambah Hari
                </Button>
              </div>
            </div>

            {/* Aksi 3 & 4: Kembalikan ke Expired / Ubah Role */}
            <div className="flex items-center justify-between pt-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={actionLoading}
                onClick={() => handleUpdatePlan("SET_FREE")}
                className="text-rose-600 hover:bg-rose-50 text-xs"
              >
                Set Expired / Free
              </Button>

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
                {selectedUser.role === "ADMIN" ? "Cabut Hak Admin" : "Jadikan Administrator"}
              </Button>
            </div>

            {/* Aksi 5: Hapus Pengguna */}
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
      )}
    </div>
  );
}
