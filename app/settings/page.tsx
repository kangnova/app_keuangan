"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { KeyRound, BrainCircuit, FlaskConical, RotateCcw, Loader2, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, Label } from "@/components/ui/input";
import { apiFetch } from "@/lib/client";
import { useAuth } from "@/lib/auth-hooks";

type SettingSource = "db" | "env" | "default";

type ModelOption = { value: string; label: string };

type SettingsPayload = {
  vision: { value: string; source: SettingSource; overridden: boolean; options: ModelOption[] };
  mock: { enabled: boolean; source: SettingSource };
  apiKeySet: boolean;
};

const SOURCE_LABEL: Record<SettingSource, string> = {
  db: "diatur dari halaman ini",
  env: "dari .env",
  default: "bawaan aplikasi",
};

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<SettingsPayload | null>(null);
  const [visionModel, setVisionModel] = useState("");
  const [mockEnabled, setMockEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<SettingsPayload>("/api/settings");
      setData(d);
      setVisionModel(d.vision.value);
      setMockEnabled(d.mock.enabled);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat pengaturan");
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== "ADMIN") {
        toast.error("Halaman ini hanya dapat diakses oleh Administrator");
        router.push("/");
        return;
      }
      load();
    }
  }, [user, authLoading, load, router]);

  async function save(next: { visionModel?: string; mockMode?: boolean }) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (next.visionModel !== undefined) body.visionModel = next.visionModel || null;
      if (next.mockMode !== undefined) body.mockMode = next.mockMode;
      const r = await apiFetch<{ vision: { value: string; source: SettingSource }; mock: { enabled: boolean; source: SettingSource } }>(
        "/api/settings",
        { method: "PUT", body: JSON.stringify(body) },
      );
      toast.success("Pengaturan disimpan");
      await load();
      // sinkronkan select dengan nilai efektif terbaru
      setVisionModel(r.vision.value);
      setMockEnabled(r.mock.enabled);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto pb-16">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground font-medium transition"
          >
            <ArrowLeft className="size-3.5" /> Kembali ke Panel Admin
          </Link>
          <span className="text-muted">•</span>
          <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
            <Shield className="size-3" /> KHUSUS ADMINISTRATOR
          </span>
        </div>
        <h1 className="text-xl font-bold">Pengaturan AI & Sistem</h1>
        <p className="text-xs text-muted mt-0.5">
          Konfigurasi model kecerdasan buatan (Vision) dan mode pengujian server.
        </p>
      </div>

      {/* Status API key */}
      <div className="flex items-center gap-3 rounded-xl bg-card p-3.5 shadow-sm">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
            data.apiKeySet ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }`}
        >
          <KeyRound className="size-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">API Key Sumopod</p>
          <p className="text-[11px] text-muted">
            {data.apiKeySet
              ? "Sudah terpasang di server (file .env) — aman, tidak ikut ter-commit."
              : "Belum diisi. Tambahkan SUMOPOD_API_KEY di .env, atau pakai Mode Demo di bawah."}
          </p>
        </div>
      </div>

      {/* Model vision */}
      <section className="rounded-xl bg-card p-4 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <BrainCircuit className="size-4 text-brand" />
          <h2 className="text-sm font-semibold">Model AI Pembaca Struk</h2>
        </div>
        <p className="mb-3 text-[11px] text-muted">
          Saat ini: <span className="font-medium text-foreground">{data.vision.value}</span> ({SOURCE_LABEL[data.vision.source]}).
        </p>
        <Label>Ubah model</Label>
        <Select value={visionModel} onChange={(e) => setVisionModel(e.target.value)} disabled={saving}>
          {data.vision.options.some((o) => o.value === visionModel) ? null : (
            <option value={visionModel}>{visionModel} (custom)</option>
          )}
          {data.vision.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <div className="mt-3 flex gap-2">
          <Button size="sm" loading={saving} disabled={visionModel === data.vision.value} onClick={() => save({ visionModel })}>
            Simpan model
          </Button>
          {data.vision.overridden && (
            <Button variant="ghost" size="sm" disabled={saving} onClick={() => save({ visionModel: "" })}>
              <RotateCcw className="size-3.5" /> Kembali ke default
            </Button>
          )}
        </div>
      </section>

      {/* Mock mode */}
      <section className="rounded-xl bg-card p-4 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <FlaskConical className="size-4 text-brand" />
          <h2 className="text-sm font-semibold">Mode Demo (tanpa AI)</h2>
        </div>
        <p className="mb-3 text-[11px] text-muted">
          {mockEnabled
            ? "Aktif — scan struk memakai data contoh, tidak memanggil AI (hemat kredit)."
            : "Mati — scan struk diproses AI Sumopod sungguhan."}
          {" "}Sumber: {SOURCE_LABEL[data.mock.source]}.
        </p>
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-line px-3.5 py-3">
          <span className="text-sm font-medium">Aktifkan mode demo</span>
          <input
            type="checkbox"
            className="size-5 accent-[#059669]"
            checked={mockEnabled}
            disabled={saving}
            onChange={(e) => save({ mockMode: e.target.checked })}
          />
        </label>
      </section>

      <p className="px-1 text-[11px] leading-relaxed text-muted">
        Pengaturan di halaman ini disimpan di database aplikasi, jadi lebih prioritas daripada .env dan tetap berlaku
        setelah redeploy. API key tetap hanya di .env/server environment — tidak bisa diubah dari sini.
      </p>
    </div>
  );
}
