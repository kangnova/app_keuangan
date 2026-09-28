"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Camera, ImageIcon, Loader2, ScanLine, TriangleAlert, Check, Trash2, History, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, Label, Input, Textarea } from "@/components/ui/input";
import { apiFetch } from "@/lib/client";
import { formatRupiah } from "@/lib/format";
import { toISODate } from "@/lib/datetime";
import type { AccountRow, CategoryRow } from "@/lib/types";
import type { ReceiptParsed } from "@/lib/ai";

type ScanResult = {
  scan: { id: string; status: string; merchant: string | null };
  parsed: ReceiptParsed;
  warnings: string[];
  mock: boolean;
};

type PendingScan = {
  id: string;
  status: string;
  merchant: string | null;
  parsed: { total?: number; date?: string | null } | null;
};

/** Kompres gambar di client: sisi panjang ≤1280px, JPEG q≈0.8, balikin dataURL. */
async function compressImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("Gagal membaca file"));
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("File bukan gambar yang valid"));
    im.src = dataUrl;
  });
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export default function ScanPage() {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [total, setTotal] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingScan[]>([]);

  const loadPending = useCallback(async () => {
    try {
      const d = await apiFetch<{ scans: PendingScan[] }>("/api/scan");
      setPending(d.scans.filter((s) => s.status === "PENDING"));
    } catch {
      /* diam saja */
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [a, c] = await Promise.all([
          apiFetch<{ accounts: AccountRow[] }>("/api/accounts"),
          apiFetch<{ categories: CategoryRow[] }>("/api/categories"),
        ]);
        setAccounts(a.accounts.filter((x) => x.isActive));
        setCategories(c.categories.filter((x) => x.type === "EXPENSE"));
        setPending((await apiFetch<{ scans: PendingScan[] }>("/api/scan")).scans.filter((s) => s.status === "PENDING"));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function analyze(file: File) {
    setAnalyzing(true);
    setResult(null);
    try {
      const dataUrl = await compressImage(file);
      setPreview(dataUrl);
      const res = await apiFetch<ScanResult>("/api/scan", {
        method: "POST",
        body: JSON.stringify({ image: dataUrl }),
      });
      setResult(res);
      setTotal(res.parsed.total);
      setDate(res.parsed.date ?? toISODate(new Date()));
      setNote(res.parsed.merchant ? `${res.parsed.merchant} (struk)` : "");
      toast.success(res.mock ? "Mode demo: hasil parse contoh" : "Struk terbaca!");
      loadPending();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menganalisa struk");
    } finally {
      setAnalyzing(false);
    }
  }

  async function confirm() {
    if (!result) return;
    if (!accountId) return toast.error("Pilih akun dulu — duit keluar dari mana?");
    if (!total || total <= 0) return toast.error("Total tidak valid, perbaiki dulu");
    setSaving(true);
    try {
      const r = await apiFetch<{ message: string }>(`/api/scan/${result.scan.id}/confirm`, {
        method: "POST",
        body: JSON.stringify({ accountId, categoryId: categoryId || null, date: date || null, note: note || null }),
      });
      toast.success(r.message ?? "Tersimpan");
      reset();
      loadPending();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function discard(id: string) {
    try {
      await apiFetch(`/api/scan/${id}/discard`, { method: "POST" });
      toast.success("Scan dibuang");
      if (result?.scan.id === id) reset();
      loadPending();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
  }

  function reset() {
    setResult(null);
    setPreview(null);
    setTotal(null);
    setDate("");
    setNote("");
    setCategoryId("");
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  async function reanalyzePending(s: PendingScan) {
    // Foto tidak dikirim ulang (arsip di server); antrean hanya pengingat —
    // alur ulang: user foto lagi. Kartu pending bisa langsung dibuang.
    await discard(s.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Scan Struk</h1>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && analyze(e.target.files[0])}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && analyze(e.target.files[0])}
      />

      {!result && !analyzing && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-card px-6 py-10 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <ScanLine className="size-8" />
          </div>
          <p className="text-sm font-semibold">Foto struk belanja lo</p>
          <p className="max-w-64 text-xs text-muted">
            AI baca otomatis: merchant, item, dan totalnya. Lo tinggal cek & simpan.
          </p>
          <div className="mt-1 flex gap-2">
            <Button onClick={() => cameraRef.current?.click()}>
              <Camera className="size-4" /> Kamera
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <ImageIcon className="size-4" /> Galeri
            </Button>
          </div>
        </div>
      )}

      {analyzing && (
        <div className="flex flex-col items-center gap-3 py-10">
          {preview && <img src={preview} alt="Struk" className="max-h-48 rounded-xl border border-line" />}
          <Loader2 className="size-7 animate-spin text-brand" />
          <p className="text-sm text-muted">AI sedang membaca struk…</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          {preview && <img src={preview} alt="Struk" className="max-h-52 self-center rounded-xl border border-line" />}

          {result.warnings.length > 0 && (
            <div className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <p className="mb-1 flex items-center gap-1 font-semibold">
                <TriangleAlert className="size-3.5" /> Cek lagi:
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl bg-card p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-bold">{result.parsed.merchant}</p>
              <p className="text-[11px] text-muted">{result.parsed.payment_method ?? "-"}</p>
            </div>
            {result.parsed.items.length > 0 && (
              <div className="mt-2 flex flex-col gap-1 border-b border-line pb-2">
                {result.parsed.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-[11px] text-muted">
                    <span className="truncate">{it.qty}× {it.name}</span>
                    <span className="tabular-nums">{formatRupiah(it.qty * it.price)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3">
              <Label required>Total (perbaiki kalau salah)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">Rp</span>
                <Input
                  inputMode="numeric"
                  className="pl-10 text-right text-base font-bold"
                  value={total ? total.toLocaleString("id-ID") : ""}
                  onChange={(e) => setTotal(e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null)}
                />
              </div>
            </div>
          </div>

          <div>
            <Label required>Duit keluar dari akun</Label>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Pilih akun</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kategori</Label>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Tanpa kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Catatan</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={160} />
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" size="lg" loading={saving} onClick={confirm}>
              <Check className="size-4" /> Simpan Pengeluaran
            </Button>
            <Button variant="danger" size="lg" onClick={() => discard(result.scan.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="size-3.5" /> Scan lain
          </Button>
        </div>
      )}

      {/* Antrean pending */}
      {pending.length > 0 && !result && (
        <section>
          <p className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold text-muted">
            <History className="size-3.5" /> Scan belum diproses ({pending.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {pending.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5 shadow-sm">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{s.merchant ?? "Struk"}</p>
                  <p className="text-[10px] text-muted">{s.parsed?.total ? formatRupiah(s.parsed.total) : "—"} · belum dikonfirmasi</p>
                </div>
                <button onClick={() => discard(s.id)} className="rounded-md p-1.5 hover:bg-rose-500/10" aria-label="Buang">
                  <Trash2 className="size-3.5 text-rose-500" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
