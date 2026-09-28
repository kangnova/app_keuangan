export type AccountRow = {
  id: string;
  name: string;
  type: string; // BANK | EWALLET | CASH
  color: string | null;
  icon: string | null;
  isActive: boolean;
  initialBalance: number;
  balance?: number;
};

export type CategoryRow = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  color: string | null;
  icon: string | null;
  isPreset: boolean;
  _count?: { transactions: number };
};

export type TxRow = {
  id: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "DEBT_PAYMENT" | "DEBT_DISBURSEMENT";
  amount: number;
  date: string;
  note: string | null;
  source: string;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  account: { id: string; name: string; color: string | null };
  toAccount: { id: string; name: string; color: string | null } | null;
  category: Pick<CategoryRow, "id" | "name" | "type" | "color" | "icon"> | null;
  debt: { id: string; name: string } | null;
};

export type DebtRow = {
  id: string;
  name: string;
  creditorName: string | null;
  initialAmount: number;
  paidAmount: number;
  dueDate: string | null;
  interestInfo: string | null;
  accountId: string;
  status: string;
  note: string | null;
  remaining: number;
  paidTotal: number;
  account?: { id: string; name: string; color: string | null };
};
