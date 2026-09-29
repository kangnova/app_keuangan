import { AccountsClient } from "@/components/accounts-client";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default function AccountsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader titleKey={(t) => t.accounts.title} />
      <AccountsClient />
    </div>
  );
}
