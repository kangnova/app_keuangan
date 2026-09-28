"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Input, Select, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/client";
import { getIcon } from "@/lib/icons";
import type { CategoryRow } from "@/lib/types";

const PRESET_COLORS = ["#f97316", "#3b82f6", "#8b5cf6", "#eab308", "#ec4899", "#22c55e", "#06b6d4", "#ef4444"];

export function CategoriesClient() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState("circle-ellipsis");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ categories: CategoryRow[] }>("/api/categories");
      setCategories(data.categories);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName("");
    setType(tab);
    setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setIcon("circle-ellipsis");
    setOpen(true);
  }

  function openEdit(c: CategoryRow) {
    setEditing(c);
    setName(c.name);
    setType(c.type);
    setColor(c.color ?? "#94a3b8");
    setIcon(c.icon ?? "circle-ellipsis");
    setOpen(true);
  }

  async function save() {
    if (!name.trim()) return toast.error("Nama kategori wajib diisi");
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/categories/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name, color, icon }),
        });
        toast.success("Kategori diupdate");
      } else {
        await apiFetch("/api/categories", { method: "POST", body: JSON.stringify({ name, type, color, icon }) });
        toast.success("Kategori ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: CategoryRow) {
    if (!window.confirm(`Hapus "${c.name}"? Transaksi yang pakai kategori ini otomatis pindah ke kategori "Lain-lain".`)) return;
    try {
      await apiFetch(`/api/categories/${c.id}`, { method: "DELETE" });
      toast.success("Kategori dihapus");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
  }

  const filtered = categories.filter((c) => c.type === tab);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-black/5 p-1 dark:bg-white/10">
        {(["EXPENSE", "INCOME"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg py-2 text-xs font-semibold transition ${tab === t ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {t === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Tags} title="Belum ada kategori" subtitle="Kategori memudahkan laporan per jenis belanja." />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((c) => {
            const Icon = getIcon(c.icon);
            return (
              <div key={c.id} className="group relative rounded-xl bg-card p-3 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${c.color ?? "#94a3b8"}22`, color: c.color ?? "#94a3b8" }}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-[11px] text-muted">{c._count?.transactions ?? 0} transaksi</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => openEdit(c)} className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Edit">
                    <Pencil className="size-3.5 text-muted" />
                  </button>
                  <button onClick={() => remove(c)} className="rounded-md p-1 hover:bg-rose-500/10" aria-label="Hapus">
                    <Trash2 className="size-3.5 text-rose-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button onClick={openCreate} className="mt-1 w-full" size="lg" variant="outline">
        <Plus className="size-4" /> Tambah Kategori
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? "Edit Kategori" : "Tambah Kategori"}>
        <div className="flex flex-col gap-4">
          <div>
            <Label required>Nama</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth: Kopi & Jajan" maxLength={60} />
          </div>
          {!editing && (
            <div>
              <Label required>Tipe</Label>
              <Select value={type} onChange={(e) => setType(e.target.value as "EXPENSE" | "INCOME")}>
                <option value="EXPENSE">Pengeluaran</option>
                <option value="INCOME">Pemasukan</option>
              </Select>
            </div>
          )}
          <div>
            <Label>Warna</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`size-8 rounded-lg transition ${color === c ? "ring-2 ring-offset-2 ring-foreground/40 dark:ring-offset-card" : ""}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Warna ${c}`}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Ikon</Label>
            <Select value={icon} onChange={(e) => setIcon(e.target.value)}>
              {ICON_CHOICES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={save} loading={saving} size="lg" className="w-full">
            Simpan
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

import { ICON_CHOICES } from "@/lib/icons";
