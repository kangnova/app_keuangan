import { db } from "@/lib/db";
import { TxList } from "@/components/tx-list";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const [accounts, categories] = await Promise.all([
    db.account.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "asc" }] }),
    db.category
      .findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] })
      .then((rows) => rows.map((c) => ({ ...c, type: c.type as "INCOME" | "EXPENSE" }))),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Transaksi</h1>
      <TxList accounts={accounts} categories={categories} />
    </div>
  );
}
