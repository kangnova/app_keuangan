import { z } from "zod";

// ===== Enum tipe =====
export const ACCOUNT_TYPES = ["BANK", "EWALLET", "CASH"] as const;
export const TX_TYPES = ["INCOME", "EXPENSE", "TRANSFER"] as const;
export const CATEGORY_TYPES = ["INCOME", "EXPENSE"] as const;

// ===== Primitives =====
// PENTING: transform HANYA "" -> null; undefined HARUS tetap undefined supaya
// PATCH tidak menghapus field yang memang tidak dikirim client.
const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Format warna #RRGGBB")
  .nullish()
  .transform((v) => (v === "" ? null : v));

const intAmount = z.coerce
  .number({ error: "Nominal tidak valid" })
  .int("Nominal harus bilangan bulat rupiah")
  .positive("Nominal harus lebih dari 0");

const nullableString = z
  .string()
  .nullish()
  .transform((v) => (v === "" ? null : v));

const optionalId = z
  .string()
  .nullish()
  .transform((v) => (v === "" ? null : v));

/** "YYYY-MM-DD" atau datetime ISO; kosong = sekarang */
const dateInput = z
  .string()
  .nullish()
  .transform((v) => (v === "" ? null : v));

// ===== Account =====
export const accountCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama akun wajib diisi").max(80),
  type: z.enum(ACCOUNT_TYPES).default("CASH"),
  initialBalance: z.coerce.number().int().min(0, "Saldo awal tidak boleh minus").default(0),
  color: hexColor,
  icon: nullableString,
});
export const accountUpdateSchema = accountCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ===== Category =====
export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama kategori wajib diisi").max(60),
  type: z.enum(CATEGORY_TYPES),
  color: hexColor,
  icon: nullableString,
});
export const categoryUpdateSchema = categoryCreateSchema.partial();

// ===== Transaction =====
export const transactionCreateSchema = z
  .object({
    type: z.enum(TX_TYPES),
    amount: intAmount,
    date: dateInput,
    note: nullableString,
    accountId: z.string().min(1, "Akun wajib dipilih"),
    toAccountId: optionalId,
    categoryId: optionalId,
  })
  .superRefine((val, ctx) => {
    if (val.type === "TRANSFER") {
      if (!val.toAccountId) {
        ctx.addIssue({ code: "custom", message: "Akun tujuan wajib dipilih", path: ["toAccountId"] });
      } else if (val.toAccountId === val.accountId) {
        ctx.addIssue({ code: "custom", message: "Akun tujuan tidak boleh sama", path: ["toAccountId"] });
      }
      if (val.categoryId) {
        ctx.addIssue({ code: "custom", message: "Transfer tidak pakai kategori", path: ["categoryId"] });
      }
    } else if (val.toAccountId) {
      ctx.addIssue({ code: "custom", message: "Akun tujuan hanya untuk transfer", path: ["toAccountId"] });
    }
  });
export const transactionUpdateSchema = z.object({
  amount: intAmount.optional(),
  date: dateInput,
  note: nullableString,
  accountId: z.string().min(1).optional(),
  toAccountId: optionalId,
  categoryId: optionalId,
});

// ===== Debt =====
export const debtCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama hutang wajib diisi").max(80),
  creditorName: nullableString,
  initialAmount: z.coerce.number().int().positive("Pokok hutang harus lebih dari 0"),
  // true (default) = uang hutang langsung masuk akun terkait (dibuatkan
  // transaksi DEBT_DISBURSEMENT otomatis). false = hutang lama yang uangnya
  // sudah lama terpakai, tanpa pergerakan saldo.
  moneyReceived: z.boolean().default(true),
  dueDate: dateInput,
  interestInfo: nullableString,
  accountId: z.string().min(1, "Akun terkait wajib dipilih"),
  note: nullableString,
});
export const debtUpdateSchema = debtCreateSchema
  .partial()
  .omit({ initialAmount: true, moneyReceived: true })
  .extend({
    initialAmount: z.coerce.number().int().positive().optional(),
    status: z.enum(["ACTIVE", "SETTLED"]).optional(),
  });

export const debtActionSchema = z.object({
  amount: intAmount,
  date: dateInput,
  accountId: z.string().min(1).optional(),
  note: nullableString,
});

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;

/**
 * Aturan catatan keterangan transaksi:
 * - Pemasukan SELALU wajib catatan (dari mana uangnya).
 * - Pengeluaran wajib catatan jika tanpa kategori atau kategori generik ("Lain-lain" dll).
 * - Transfer opsional.
 * Return pesan error, atau null jika lolos.
 */
export function noteRequiredError(
  type: string,
  categoryName: string | null | undefined,
  note: string | null | undefined,
): string | null {
  const hasNote = !!note?.trim();
  if (type === "INCOME" && !hasNote) {
    return "Catatan wajib untuk pemasukan: uang ini dari mana?";
  }
  if (type === "EXPENSE" && !hasNote && (!categoryName || /lain/i.test(categoryName))) {
    return "Catatan wajib: pengeluaran ini dipakai untuk apa?";
  }
  return null;
}
