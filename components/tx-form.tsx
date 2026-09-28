"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { apiFetch } from "@/lib/client";
import { toISODate } from "@/lib/datetime";
import type { AccountRow, CategoryRow, TxRow } from "@/lib/types";
import type { BadgeTone } from "@/components/ui/badge";

type Mode =
  | { kind: "create"; defaultType?: "INCOME" | "EXPENSE" | "TRANSFER" }
  | { kind: "edit"; tx: TxRow };

const TYPE_TABS = [
  { value: "EXPENSE", label: "Pengeluaran", tone: "red" },
  { value: "INCOME", label: "Pemasukan", tone: "green" },
  { value: "TRANSFER", label: "Transfer", tone: "blue" },
] as const;

/** Placeholder catatan yang menyesuaikan kategori, biar user tahu apa yang harus ditulis. */
function notePlaceholder(catName: string | undefined, type: string): string {
  if (type === "INCOME") {
    if (!catName || /lain/i.test(catName)) return "wajib: dari mana uangnya? cth: titipan jualan";
    if (/gaji/i.test(catName)) return "wajib: gaji dari kerja yang mana? cth: PT Maju / warung";
    if (/bonus/i.test(catName)) return "wajib: bonus apa? cth: bonus proyek klien A";
    if (/hadiah/i.test(catName)) return "wajib: hadiah dari siapa? cth: dari Budi";
    if (/usaha/i.test(catName)) return "wajib: dari mana? cth: untung jualan online";
    return "wajib: asal uangnya, cth: dari klien A";
  }
  if (!catName || /lain/i.test(catName)) return "wajib: dipakai untuk apa? cth: beli obat, ongkir";
  return "cth: makan siang warteg / bayar parkir";
}

export function TxForm({
  open,
  onClose,
  accounts,
  categories,
  mode,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  accounts: AccountRow[];
  categories: CategoryRow[];
  mode: Mode;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const isEdit = mode.kind === "edit";
  const [type, setType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">("EXPENSE");
  const [amount, setAmount] = useState<number | null>(null);
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode.kind === "edit") {
      const t = mode.tx;
      setType(t.type === "DEBT_PAYMENT" || t.type === "DEBT_DISBURSEMENT" ? "EXPENSE" : t.type);
      setAmount(t.amount);
      setAccountId(t.accountId);
      setToAccountId(t.toAccountId ?? "");
      setCategoryId(t.categoryId ?? "");
      setDate(toISODate(new Date(t.date)));
      setNote(t.note ?? "");
    } else {
      setType(mode.defaultType ?? "EXPENSE");
      setAmount(null);
      setAccountId(accounts.find((a) => a.isActive)?.id ?? "");
      setToAccountId("");
      setCategoryId("");
      setDate(toISODate(new Date()));
      setNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const activeAccounts = accounts.filter((a) => a.isActive || a.id === accountId);
  const catOptions = useMemo(
    () => categories.filter((c) => (type === "INCOME" ? c.type === "INCOME" : c.type === "EXPENSE")),
    [categories, type],
  );

  const selectedCat =
    catOptions.find((c) => c.id === categoryId) ??
    (mode.kind === "edit" ? categories.find((c) => c.id === mode.tx.categoryId) : undefined);
  // Pemasukan selalu wajib catatan asal uang; pengeluaran wajib jika tanpa kategori
  // atau ke kategori generik seperti "Lain-lain".
  const noteRequired =
    type === "INCOME" ||
    (type === "EXPENSE" && (!categoryId || /lain/i.test(selectedCat?.name ?? "")));

  async function submit() {
    if (!amount) return toast.error("Isi nominal dulu");
    if (!accountId) return toast.error("Pilih akun dulu");
    if (type === "TRANSFER" && !toAccountId) return toast.error("Pilih akun tujuan");
    if (noteRequired && !note.trim()) {
      return toast.error(
        type === "INCOME"
          ? "Catatan wajib: uang masuk ini dari mana?"
          : "Catatan wajib: pengeluaran ini dipakai untuk apa?",
      );
    }
    setSaving(true);
    try {
      const payload = {
        amount,
        date,
        note: note || null,
        accountId,
        ...(type === "TRANSFER" ? { toAccountId } : { categoryId: categoryId || null }),
      };
      if (isEdit) {
        await apiFetch(`/api/transactions/${mode.tx.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Transaksi diupdate");
      } else {
        await apiFetch("/api/transactions", {
          method: "POST",
          body: JSON.stringify({ ...payload, type }),
        });
        toast.success("Transaksi tersimpan");
      }
      onClose();
      onSaved?.();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? "Edit Transaksi" : "Catat Transaksi"}>
      <div className="flex flex-col gap-4">
        {isEdit ? (
          <div className="rounded-xl bg-black/5 px-3 py-2 text-xs dark:bg-white/10">
            Tipe: <b>{TYPE_TABS.find((t) => t.value === mode.tx.type)?.label ?? mode.tx.type}</b>
            {mode.tx.debt && <span> · terkait hutang <b>{mode.tx.debt.name}</b></span>}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-black/5 p-1 dark:bg-white/10">
            {TYPE_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setType(t.value);
                  setCategoryId("");
                }}
                className={`rounded-lg py-2 text-xs font-semibold transition ${
                  type === t.value ? "bg-card shadow-sm" : "text-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <AmountInput value={amount} onChange={setAmount} autoFocus={!isEdit} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>{type === "TRANSFER" ? "Dari Akun" : "Akun"}</Label>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Pilih akun</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          {type === "TRANSFER" && (
            <div>
              <Label required>Ke Akun</Label>
              <Select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                <option value="">Pilih akun</option>
                {activeAccounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </Select>
            </div>
          )}
        </div>

        {type !== "TRANSFER" && (
          <div>
            <Label>Kategori</Label>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Tanpa kategori</option>
              {catOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <Label required={noteRequired}>
            Catatan {type === "INCOME" ? "(asal uang)" : type === "TRANSFER" ? "(opsional)" : "(keperluan)"}
          </Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={notePlaceholder(selectedCat?.name, type)}
            maxLength={160}
          />
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Contoh: "gaji dari PT Maju", "hadiah dari Budi", "beli obat flu" — biar riwayat
            &amp; laporan keuangan lo gampang dibaca.
          </p>
        </div>

        <div>
          <Label>Tanggal</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <Button onClick={submit} loading={saving} size="lg" className="mt-1 w-full">
          {isEdit ? "Simpan Perubahan" : "Simpan"}
        </Button>
      </div>
    </Sheet>
  );
}

export const TX_TONE: Record<string, BadgeTone> = {
  EXPENSE: "red",
  INCOME: "green",
  TRANSFER: "blue",
  DEBT_PAYMENT: "amber",
  DEBT_DISBURSEMENT: "amber",
};
