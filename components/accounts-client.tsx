"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wallet, Plus, Pencil, Power, Trash2, Loader2, Landmark, Smartphone, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Input, Select, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/client";
import { formatRupiah } from "@/lib/format";
import { getIcon, ICON_CHOICES } from "@/lib/icons";
import { useLanguage } from "@/lib/i18n";
import type { AccountRow } from "@/lib/types";

const TYPE_ICON: Record<string, typeof Wallet> = { BANK: Landmark, EWALLET: Smartphone, CASH: Banknote };

export function AccountsClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("CASH");
  const [initialBalance, setInitialBalance] = useState<number | null>(null);
  const [color, setColor] = useState("#059669");
  const [icon, setIcon] = useState("wallet");
  const [saving, setSaving] = useState(false);

  const typeLabel: Record<string, string> = {
    BANK: t.accounts.bank,
    EWALLET: t.accounts.ewallet,
    CASH: t.accounts.cash,
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ accounts: AccountRow[]; total: number }>("/api/accounts");
      setAccounts(data.accounts);
      setTotal(data.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }, [t.common.error]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName("");
    setType("CASH");
    setInitialBalance(null);
    setColor("#059669");
    setIcon("wallet");
    setOpen(true);
  }

  function openEdit(a: AccountRow) {
    setEditing(a);
    setName(a.name);
    setType(a.type);
    setInitialBalance(a.initialBalance);
    setColor(a.color ?? "#059669");
    setIcon(a.icon ?? "wallet");
    setOpen(true);
  }

  async function save() {
    if (!name.trim()) return toast.error(language === "en" ? "Account name is required" : "Nama akun wajib diisi");
    setSaving(true);
    try {
      const payload = { name, type, initialBalance: initialBalance ?? 0, color, icon };
      if (editing) {
        await apiFetch(`/api/accounts/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success(t.common.success);
      } else {
        await apiFetch("/api/accounts", { method: "POST", body: JSON.stringify(payload) });
        toast.success(t.common.success);
      }
      setOpen(false);
      load();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.common.error);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(a: AccountRow) {
    try {
      await apiFetch(`/api/accounts/${a.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !a.isActive }),
      });
      toast.success(a.isActive ? (language === "en" ? "Account deactivated" : "Akun dinonaktifkan") : (language === "en" ? "Account activated" : "Akun diaktifkan"));
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.common.error);
    }
  }

  async function remove(a: AccountRow) {
    if (!window.confirm(`${t.accounts.deleteConfirm} ("${a.name}")`)) return;
    try {
      await apiFetch(`/api/accounts/${a.id}`, { method: "DELETE" });
      toast.success(t.common.success);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.common.error);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-gradient-to-br from-brand to-emerald-600 p-5 text-white shadow-lg shadow-brand/20">
        <p className="text-xs opacity-80">{t.accounts.totalBalance}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{formatRupiah(total)}</p>
        <p className="mt-1 text-[11px] opacity-70">{language === "en" ? "Calculated from initial balances + all transactions" : "Dihitung dari saldo awal + semua transaksi"}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted" />
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState icon={Wallet} title={t.accounts.noAccounts} subtitle={language === "en" ? "Add your bank accounts, e-wallets, or cash wallet." : "Tambahkan rekening bank, e-wallet, atau dompet cash lo."} />
      ) : (
        accounts.map((a) => {
          const TypeIcon = TYPE_ICON[a.type] ?? Wallet;
          return (
            <div key={a.id} className="group flex items-center gap-3 rounded-xl bg-card p-3.5 shadow-sm">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${a.color ?? "#94a3b8"}22`, color: a.color ?? "#94a3b8" }}
              >
                <TypeIcon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  {a.name}
                  {!a.isActive && <Badge tone="gray">{t.accounts.inactive}</Badge>}
                </p>
                <p className="text-xs text-muted">{typeLabel[a.type] ?? a.type}</p>
              </div>
              <p className={`text-sm font-bold tabular-nums ${a.balance !== undefined && a.balance < 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>
                {formatRupiah(a.balance ?? 0)}
              </p>
              <div className="flex flex-col gap-0.5 opacity-60 transition group-hover:opacity-100">
                <button onClick={() => openEdit(a)} className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Edit">
                  <Pencil className="size-3.5 text-muted" />
                </button>
                <button onClick={() => toggleActive(a)} className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10" aria-label={t.accounts.toggleStatus}>
                  <Power className={`size-3.5 ${a.isActive ? "text-muted" : "text-amber-500"}`} />
                </button>
                <button onClick={() => remove(a)} className="rounded-md p-1 hover:bg-rose-500/10" aria-label="Delete">
                  <Trash2 className="size-3.5 text-rose-500" />
                </button>
              </div>
            </div>
          );
        })
      )}

      <Button onClick={openCreate} className="mt-1 w-full" size="lg" variant="outline">
        <Plus className="size-4" /> {t.accounts.addAccount}
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? t.accounts.editAccount : t.accounts.addAccount}>
        <div className="flex flex-col gap-4">
          <div>
            <Label required>{t.accounts.accountName}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.accounts.accountNamePlaceholder} maxLength={80} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>{t.accounts.accountType}</Label>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="CASH">{t.accounts.cash}</option>
                <option value="BANK">{t.accounts.bank}</option>
                <option value="EWALLET">{t.accounts.ewallet}</option>
              </Select>
            </div>
            <div>
              <Label>{editing ? `${t.accounts.initialBalance} (${language === "en" ? "locked" : "terkunci"})` : t.accounts.initialBalance}</Label>
              <Input
                inputMode="numeric"
                value={initialBalance ?? ""}
                disabled={!!editing}
                onChange={(e) => setInitialBalance(e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.accounts.themeColor}</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="size-9 cursor-pointer rounded-lg" />
                <Input value={color} onChange={(e) => setColor(e.target.value)} maxLength={7} />
              </div>
            </div>
            <div>
              <Label>{t.accounts.icon}</Label>
              <Select value={icon} onChange={(e) => setIcon(e.target.value)}>
                {ICON_CHOICES.map((choiceName) => (
                  <option key={choiceName} value={choiceName}>
                    {choiceName}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <Button onClick={save} loading={saving} size="lg" className="w-full">
            {t.common.save}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
