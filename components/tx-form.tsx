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
import { useLanguage } from "@/lib/i18n";
import type { AccountRow, CategoryRow, TxRow } from "@/lib/types";
import type { BadgeTone } from "@/components/ui/badge";

type Mode =
  | { kind: "create"; defaultType?: "INCOME" | "EXPENSE" | "TRANSFER" }
  | { kind: "edit"; tx: TxRow };

function notePlaceholder(catName: string | undefined, type: string, lang: string): string {
  if (lang === "en") {
    if (type === "INCOME") {
      if (!catName || /other/i.test(catName)) return "Source of income: e.g. Freelance project";
      if (/salary/i.test(catName)) return "e.g. Monthly salary from company";
      if (/bonus/i.test(catName)) return "e.g. Project completion bonus";
      if (/gift/i.test(catName)) return "e.g. Birthday gift from friend";
      return "Source of income: e.g. Client payment";
    }
    if (!catName || /other/i.test(catName)) return "e.g. Pharmacy, shipping fee";
    return "e.g. Team lunch / parking fee";
  }
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
  const { t, language } = useLanguage();
  const isEdit = mode.kind === "edit";
  const [type, setType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">("EXPENSE");
  const [amount, setAmount] = useState<number | null>(null);
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const typeTabs = [
    { value: "EXPENSE", label: t.transactions.expenseTab, tone: "red" },
    { value: "INCOME", label: t.transactions.incomeTab, tone: "green" },
    { value: "TRANSFER", label: t.transactions.transferTab, tone: "blue" },
  ] as const;

  useEffect(() => {
    if (!open) return;
    if (mode.kind === "edit") {
      const txItem = mode.tx;
      setType(txItem.type === "DEBT_PAYMENT" || txItem.type === "DEBT_DISBURSEMENT" ? "EXPENSE" : txItem.type);
      setAmount(txItem.amount);
      setAccountId(txItem.accountId);
      setToAccountId(txItem.toAccountId ?? "");
      setCategoryId(txItem.categoryId ?? "");
      setDate(toISODate(new Date(txItem.date)));
      setNote(txItem.note ?? "");
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

  const noteRequired =
    type === "INCOME" ||
    (type === "EXPENSE" && (!categoryId || /lain|other/i.test(selectedCat?.name ?? "")));

  async function submit() {
    if (!amount) return toast.error(language === "en" ? "Please enter an amount" : "Isi nominal dulu");
    if (!accountId) return toast.error(language === "en" ? "Please select an account" : "Pilih akun dulu");
    if (type === "TRANSFER" && !toAccountId) return toast.error(language === "en" ? "Please select destination account" : "Pilih akun tujuan");
    if (noteRequired && !note.trim()) {
      return toast.error(
        type === "INCOME"
          ? (language === "en" ? "Note required: source of income?" : "Catatan wajib: uang masuk ini dari mana?")
          : (language === "en" ? "Note required: what was this expense for?" : "Catatan wajib: pengeluaran ini dipakai untuk apa?"),
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
        toast.success(t.transactions.savedSuccess);
      } else {
        await apiFetch("/api/transactions", {
          method: "POST",
          body: JSON.stringify({ ...payload, type }),
        });
        toast.success(t.transactions.savedSuccess);
      }
      onClose();
      onSaved?.();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.common.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? t.transactions.editTransaction : t.transactions.addTransaction}>
      <div className="flex flex-col gap-4">
        {isEdit ? (
          <div className="rounded-xl bg-black/5 px-3 py-2 text-xs dark:bg-white/10">
            {t.common.type}: <b>{typeTabs.find((tab) => tab.value === mode.tx.type)?.label ?? mode.tx.type}</b>
            {mode.tx.debt && <span> · {t.debts.title}: <b>{mode.tx.debt.name}</b></span>}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-black/5 p-1 dark:bg-white/10">
            {typeTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setType(tab.value);
                  setCategoryId("");
                }}
                className={`rounded-lg py-2 text-xs font-semibold transition ${
                  type === tab.value ? "bg-card shadow-sm" : "text-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <AmountInput value={amount} onChange={setAmount} autoFocus={!isEdit} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>{type === "TRANSFER" ? t.transactions.fromAccountLabel : t.transactions.accountLabel}</Label>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">{t.transactions.selectAccount}</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          {type === "TRANSFER" && (
            <div>
              <Label required>{t.transactions.toAccountLabel}</Label>
              <Select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                <option value="">{t.transactions.selectAccount}</option>
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
            <Label>{t.transactions.categoryLabel}</Label>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">{t.transactions.noCategory}</option>
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
            {t.transactions.noteLabel} {type === "INCOME" ? (language === "en" ? "(source)" : "(asal uang)") : type === "TRANSFER" ? `(${t.common.optional})` : `(${t.common.required})`}
          </Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={notePlaceholder(selectedCat?.name, type, language)}
            maxLength={160}
          />
        </div>

        <div>
          <Label>{t.transactions.dateLabel}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <Button onClick={submit} loading={saving} size="lg" className="mt-1 w-full">
          {isEdit ? t.transactions.updateTx : (type === "EXPENSE" ? t.transactions.saveExpense : type === "INCOME" ? t.transactions.saveIncome : t.transactions.saveTransfer)}
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
