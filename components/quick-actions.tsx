"use client";

import { useState } from "react";
import { Plus, Minus, ArrowLeftRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { TxForm } from "@/components/tx-form";
import type { AccountRow, CategoryRow } from "@/lib/types";

export function QuickActions({
  accounts,
  categories,
}: {
  accounts: AccountRow[];
  categories: CategoryRow[];
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">("EXPENSE");

  const openWith = (t: "INCOME" | "EXPENSE" | "TRANSFER") => {
    setDefaultType(t);
    setOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => openWith("EXPENSE")}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/10 py-3 text-xs font-semibold text-rose-600 transition active:scale-[0.98] dark:text-rose-400"
        >
          <Minus className="size-4" /> {t.dashboard.expense}
        </button>
        <button
          onClick={() => openWith("INCOME")}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 py-3 text-xs font-semibold text-emerald-600 transition active:scale-[0.98] dark:text-emerald-400"
        >
          <Plus className="size-4" /> {t.dashboard.income}
        </button>
        <button
          onClick={() => openWith("TRANSFER")}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500/10 py-3 text-xs font-semibold text-sky-600 transition active:scale-[0.98] dark:text-sky-400"
        >
          <ArrowLeftRight className="size-4" /> {t.dashboard.transfer}
        </button>
      </div>

      <TxForm
        open={open}
        onClose={() => setOpen(false)}
        accounts={accounts}
        categories={categories}
        mode={{ kind: "create", defaultType }}
      />
    </>
  );
}
