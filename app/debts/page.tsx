import { db } from "@/lib/db";
import { DebtsClient } from "@/components/debts-client";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function DebtsPage() {
  const accounts = await db.account.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "asc" }] });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader titleKey={(t) => t.debts.title} />
      <DebtsClient accounts={accounts} />
    </div>
  );
}
