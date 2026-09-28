import { AccountsClient } from "@/components/accounts-client";

export const dynamic = "force-dynamic";

export default function AccountsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Akun & Saldo</h1>
      <AccountsClient />
    </div>
  );
}
