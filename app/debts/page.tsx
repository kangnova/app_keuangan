import { db } from "@/lib/db";
import { DebtsClient } from "@/components/debts-client";

export const dynamic = "force-dynamic";

export default async function DebtsPage() {
  const accounts = await db.account.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "asc" }] });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Hutang</h1>
      <DebtsClient accounts={accounts} />
    </div>
  );
}
