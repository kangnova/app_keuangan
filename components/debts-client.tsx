"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, HandCoins, Loader2, Pencil, Trash2, ArrowDownToLine, CircleCheck, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Input, Textarea, Label } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/client";
import { formatRupiah } from "@/lib/format";
import { formatTanggal, toISODate } from "@/lib/datetime";
import type { AccountRow, DebtRow } from "@/lib/types";

export function DebtsClient({ accounts }: { accounts: AccountRow[] }) {
  const router = useRouter();
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [totalRemaining, setTotalRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<{ type: "pay" | "disburse"; debt: DebtRow } | null>(null);
  const [editing, setEditing] = useState<DebtRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ debts: DebtRow[]; totalRemaining: number }>("/api/debts");
      setDebts(data.debts);
      setTotalRemaining(data.totalRemaining);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(d: DebtRow) {
    if (!window.confirm(`Hapus hutang "${d.name}"?`)) return;
    try {
      await apiFetch(`/api/debts/${d.id}`, { method: "DELETE" });
      toast.success("Hutang dihapus");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
  }

  const active = debts.filter((d) => d.status === "ACTIVE");
  const settled = debts.filter((d) => d.status !== "ACTIVE");

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 p-5 text-white shadow-lg shadow-rose-500/20">
        <p className="text-xs opacity-80">Total sisa hutang</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{formatRupiah(totalRemaining)}</p>
        <p className="mt-1 text-[11px] opacity-70">
          {active.length} hutang berjalan · cicilan tidak dihitung sebagai pengeluaran harian
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted" />
        </div>
      ) : debts.length === 0 ? (
        <EmptyState icon={HandCoins} title="Bebas hutang 🎉" subtitle="Catat hutang lo di sini biar cicilannya nggak nyampur dengan pengeluaran." />
      ) : (
        <>
          {active.map((d) => (
            <DebtCard
              key={d.id}
              debt={d}
              accounts={accounts}
              onAction={setAction}
              onEdit={(x) => {
                setEditing(x);
                setOpen(true);
              }}
              onDelete={remove}
              onChanged={load}
            />
          ))}
          {settled.length > 0 && (
            <>
              <p className="px-1 pt-2 text-xs font-semibold text-muted">LUNAS</p>
              {settled.map((d) => (
                <DebtCard
                  key={d.id}
                  debt={d}
                  accounts={accounts}
                  onAction={setAction}
                  onEdit={(x) => {
                    setEditing(x);
                    setOpen(true);
                  }}
                  onDelete={remove}
                  onChanged={load}
                />
              ))}
            </>
          )}
        </>
      )}

      <Button onClick={() => setOpen(true)} className="mt-1 w-full" size="lg" variant="outline">
        <Plus className="size-4" /> Catat Hutang
      </Button>

      <DebtForm
        open={open}
        onClose={() => setOpen(false)}
        accounts={accounts}
        editing={editing}
        onSaved={() => {
          setOpen(false);
          setEditing(null);
          load();
          router.refresh();
        }}
      />
      {action && (
        <DebtActionSheet
          action={action}
          accounts={accounts}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null);
            load();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function DebtCard({
  debt: d,
  accounts,
  onAction,
  onEdit,
  onDelete,
  onChanged,
}: {
  debt: DebtRow;
  accounts: AccountRow[];
  onAction: (a: { type: "pay" | "disburse"; debt: DebtRow }) => void;
  onEdit: (d: DebtRow) => void;
  onDelete: (d: DebtRow) => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const isSettled = d.status !== "ACTIVE";
  // Robust untuk hutang yang pokoknya via pencairan: pakai terbayar / (terbayar + sisa)
  const principalTotal = d.paidTotal + Math.max(d.remaining, 0);
  const pct = principalTotal > 0 ? Math.min(100, Math.round((d.paidTotal / principalTotal) * 100)) : 0;
  const dueLabel = d.dueDate ? formatTanggal(new Date(d.dueDate)) : null;
  const dueSoon = d.dueDate && !isSettled && new Date(d.dueDate).getTime() - Date.now() < 14 * 864e5;

  async function settleNow() {
    if (!window.confirm(`Tandai "${d.name}" lunas tanpa transaksi?`)) return;
    try {
      await apiFetch(`/api/debts/${d.id}`, { method: "PATCH", body: JSON.stringify({ status: "SETTLED" }) });
      toast.success("Ditandai lunas");
      onChanged();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
  }

  return (
    <div className="rounded-xl bg-card p-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
          <HandCoins className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            {d.name}
            {isSettled && <Badge tone="green"><CircleCheck className="size-3" /> Lunas</Badge>}
            {dueSoon && <Badge tone="red"><CalendarClock className="size-3" /> Jatuh tempo dekat</Badge>}
          </p>
          <p className="text-xs text-muted">
            {d.creditorName ? `${d.creditorName} · ` : ""}
            via {d.account?.name ?? "akun"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums">{formatRupiah(d.remaining)}</p>
          <p className="text-[11px] text-muted">dari {formatRupiah(d.initialAmount)}</p>
        </div>
      </div>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-muted">
        Terbayar {formatRupiah(d.paidTotal)} ({pct}%){dueLabel ? ` · tempo ${dueLabel}` : ""}
        {d.interestInfo ? ` · ${d.interestInfo}` : ""}
      </p>

      <div className="mt-3 flex gap-2">
        {!isSettled && (
          <>
            <Button size="sm" variant="primary" className="flex-1" onClick={() => onAction({ type: "pay", debt: d })}>
              Bayar Cicilan
            </Button>
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => onAction({ type: "disburse", debt: d })}>
              <ArrowDownToLine className="size-3.5" /> Cair
            </Button>
            <Button size="sm" variant="ghost" onClick={settleNow} title="Tandai lunas tanpa transaksi">
              <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" onClick={() => onEdit(d)} title="Edit">
          <Pencil className="size-4 text-muted" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(d)} title="Hapus">
          <Trash2 className="size-4 text-rose-500" />
        </Button>
      </div>
    </div>
  );
}

function DebtForm({
  open,
  onClose,
  accounts,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  accounts: AccountRow[];
  editing: DebtRow | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [creditorName, setCreditorName] = useState("");
  const [initialAmount, setInitialAmount] = useState<number | null>(null);
  const [accountId, setAccountId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [interestInfo, setInterestInfo] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setCreditorName(editing.creditorName ?? "");
      setInitialAmount(editing.initialAmount);
      setAccountId(editing.accountId);
      setDueDate(editing.dueDate ? editing.dueDate.slice(0, 10) : "");
      setInterestInfo(editing.interestInfo ?? "");
      setNote(editing.note ?? "");
    } else {
      setName("");
      setCreditorName("");
      setInitialAmount(null);
      setAccountId(accounts.find((a) => a.isActive)?.id ?? "");
      setDueDate("");
      setInterestInfo("");
      setNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  async function save() {
    if (!name.trim()) return toast.error("Nama hutang wajib diisi");
    if (!initialAmount) return toast.error("Isi pokok hutang");
    if (!accountId) return toast.error("Pilih akun terkait");
    setSaving(true);
    try {
      const payload = {
        name,
        creditorName: creditorName || null,
        initialAmount,
        accountId,
        dueDate: dueDate || null,
        interestInfo: interestInfo || null,
        note: note || null,
      };
      if (editing) {
        await apiFetch(`/api/debts/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Hutang diupdate");
      } else {
        await apiFetch("/api/debts", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Hutang dicatat");
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit Hutang" : "Catat Hutang Baru"}>
      <div className="flex flex-col gap-4">
        <div>
          <Label required>Untuk apa hutangnya?</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth: Paylater Shopee, Pinjem Budi" maxLength={80} />
        </div>
        <AmountInput value={initialAmount} onChange={setInitialAmount} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Pemberi hutang</Label>
            <Input value={creditorName} onChange={(e) => setCreditorName(e.target.value)} placeholder="cth: Budi / Bank X" maxLength={80} />
          </div>
          <div>
            <Label>Akun terkait</Label>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Pilih akun</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Jatuh tempo</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <Label>Info bunga</Label>
            <Input value={interestInfo} onChange={(e) => setInterestInfo(e.target.value)} placeholder="cth: bunga 2%/bln" maxLength={60} />
          </div>
        </div>
        <div>
          <Label>Catatan</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="opsional" maxLength={200} />
        </div>
        <Button onClick={save} loading={saving} size="lg" className="w-full">
          Simpan
        </Button>
      </div>
    </Sheet>
  );
}

function DebtActionSheet({
  action,
  accounts,
  onClose,
  onDone,
}: {
  action: { type: "pay" | "disburse"; debt: DebtRow };
  accounts: AccountRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const isPay = action.type === "pay";
  const [amount, setAmount] = useState<number | null>(isPay ? action.debt.remaining : null);
  const [accountId, setAccountId] = useState(action.debt.accountId);
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!amount) return toast.error("Isi nominal");
    setSaving(true);
    try {
      await apiFetch(`/api/debts/${action.debt.id}/${isPay ? "pay" : "disburse"}`, {
        method: "POST",
        body: JSON.stringify({ amount, accountId, date, note: note || null }),
      });
      toast.success(isPay ? "Cicilan tercatat" : "Pencairan tercatat");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={isPay ? `Bayar ${action.debt.name}` : `Cairkan ${action.debt.name}`}>
      <div className="flex flex-col gap-4">
        {isPay && (
          <div className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            Sisa pokok: <b>{formatRupiah(action.debt.remaining)}</b> — pembayaran melebihi ini akan ditolak.
          </div>
        )}
        <AmountInput value={amount} onChange={setAmount} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{isPay ? "Bayar dari" : "Masuk ke akun"}</Label>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
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
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="opsional" maxLength={120} />
        </div>
        <Button onClick={submit} loading={saving} size="lg" className="w-full">
          {isPay ? "Bayar" : "Catat Pencairan"}
        </Button>
      </div>
    </Sheet>
  );
}
