// Smoke test API Duitku — jalankan dengan server production berjalan:
//   DATABASE_URL="file:./test.db" npx next start -p 3111
//   node scripts/smoke.mjs
const BASE = process.env.SMOKE_URL ?? "http://localhost:3111";

let passed = 0;
const failures = [];

function assert(cond, label, extra) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failures.push(label);
    console.error(`  ❌ ${label}`, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : "");
  }
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

// ============ 1. AKUN ============
console.log("\n=== 1. AKUN ===");
let r = await req("GET", "/api/accounts");
assert(r.status === 200 && r.json.ok, "GET /api/accounts");
const seeded = r.json.data.accounts;
assert(seeded.length >= 3, `Seed: 3 akun contoh (dapat ${seeded.length})`);
const totalSeeded = seeded.reduce((s, a) => s + a.balance, 0);
assert(totalSeeded === 5_750_000, `Saldo gabungan seed = 5.750.000 (dapat ${totalSeeded})`, totalSeeded);

r = await req("POST", "/api/accounts", { name: "DANA Test", type: "EWALLET", initialBalance: 100000, color: "#3b82f6", icon: "smartphone" });
assert(r.status === 201, "POST akun baru (201)");
const dana = r.json.data;

r = await req("POST", "/api/accounts", { name: "", type: "CASH" });
assert(r.status === 400, "POST akun tanpa nama ditolak (400)");

r = await req("PATCH", `/api/accounts/${dana.id}`, { name: "DANA Rename", color: "#22c55e" });
assert(r.status === 200 && r.json.data.name === "DANA Rename", "PATCH akun (rename)");

// ============ 2. KATEGORI ============
console.log("\n=== 2. KATEGORI ===");
r = await req("GET", "/api/categories");
assert(r.status === 200, "GET /api/categories");
const cats = r.json.data.categories;
assert(cats.length >= 13, `Seed: 13 kategori (dapat ${cats.length})`);
const makan = cats.find((c) => c.name === "Makan & Minum");
const gaji = cats.find((c) => c.name === "Gaji");
assert(!!makan && !!gaji, "Kategori Makan & Minum + Gaji ada");

r = await req("POST", "/api/categories", { name: "Kopi Test", type: "EXPENSE", color: "#f97316", icon: "coffee" });
assert(r.status === 201, "POST kategori baru (201)");
const kopi = r.json.data;
r = await req("POST", "/api/categories", { name: "Kopi Test", type: "EXPENSE", color: "#f97316", icon: "coffee" });
assert(r.status === 409, "POST kategori duplikat ditolak (409)");

// ============ 3. TRANSAKSI ============
console.log("\n=== 3. TRANSAKSI ===");
const cash = seeded.find((a) => a.name === "Dompet Cash");
const bca = seeded.find((a) => a.name === "BCA");

r = await req("POST", "/api/transactions", { type: "EXPENSE", amount: 25000, accountId: cash.id, categoryId: makan.id, note: "makan siang" });
assert(r.status === 201, "POST pengeluaran 25rb (201)");
const txExpense = r.json.data;

r = await req("POST", "/api/transactions", { type: "INCOME", amount: 2000000, accountId: bca.id, categoryId: gaji.id, note: "gaji" });
assert(r.status === 201, "POST pemasukan 2jt (201)");

r = await req("POST", "/api/transactions", { type: "TRANSFER", amount: 150000, accountId: bca.id, toAccountId: cash.id });
assert(r.status === 201, "POST transfer BCA->Cash 150rb (201)");
const txTransfer = r.json.data;

r = await req("POST", "/api/transactions", { type: "TRANSFER", amount: 1000, accountId: bca.id, toAccountId: bca.id });
assert(r.status === 400, "Transfer ke akun sama ditolak (400)");

r = await req("POST", "/api/transactions", { type: "EXPENSE", amount: 5000, accountId: cash.id, categoryId: gaji.id });
assert(r.status === 400, "Kategori INCOME untuk EXPENSE ditolak (400)");

r = await req("POST", "/api/transactions", { type: "EXPENSE", amount: -5, accountId: cash.id });
assert(r.status === 400, "Nominal minus ditolak (400)");

r = await req("GET", "/api/accounts");
const cashAfter = r.json.data.accounts.find((a) => a.id === cash.id);
const bcaAfter = r.json.data.accounts.find((a) => a.id === bca.id);
assert(cashAfter.balance === 500000 - 25000 + 150000, `Saldo Cash = 625.000 (dapat ${cashAfter.balance})`);
assert(bcaAfter.balance === 5000000 + 2000000 - 150000, `Saldo BCA = 6.850.000 (dapat ${bcaAfter.balance})`);

r = await req("PATCH", `/api/transactions/${txExpense.id}`, { amount: 30000 });
assert(r.status === 200 && r.json.data.amount === 30000, "PATCH transaksi (edit nominal)");
assert(r.json.data.category?.id === makan.id, "PATCH parsial tidak menghapus kategori (regresi bug)");
r = await req("GET", "/api/accounts");
assert(r.json.data.accounts.find((a) => a.id === cash.id).balance === 500000 - 30000 + 150000, "Saldo ter-update setelah edit");

r = await req("DELETE", `/api/transactions/${txTransfer.id}`);
assert(r.status === 200, "DELETE transfer");
r = await req("GET", "/api/accounts");
assert(r.json.data.accounts.find((a) => a.id === cash.id).balance === 500000 - 30000, "Saldo kembali akurat setelah hapus transfer");

// Filter bulan
r = await req("GET", `/api/transactions?month=${new Date().toISOString().slice(0, 7)}`);
assert(r.status === 200 && r.json.data.transactions.length >= 2, "GET transaksi bulan ini (filter)");
r = await req("GET", "/api/transactions?month=1999-01");
assert(r.status === 200 && r.json.data.transactions.length === 0, "Filter bulan lain = kosong");

// ============ 4. HUTANG ============
console.log("\n=== 4. HUTANG ===");
// Skenario A: hutang lama (uang sudah lama terpakai) — tanpa pergerakan saldo
r = await req("POST", "/api/debts", { name: "Paylater Test", creditorName: "Shopee", initialAmount: 2000000, accountId: bca.id, moneyReceived: false, dueDate: "2026-12-25", interestInfo: "bunga 2%/bln" });
assert(r.status === 201, "POST hutang lama tanpa cair (201)");
const debt = r.json.data;

r = await req("GET", "/api/accounts");
const bcaBefore = r.json.data.accounts.find((a) => a.id === bca.id).balance;

r = await req("GET", "/api/debts");
let d = r.json.data.debts.find((x) => x.id === debt.id);
assert(d.remaining === 2000000, "Sisa pokok awal = 2.000.000");

// Skenario B: hutang baru, uang langsung cair otomatis
r = await req("POST", "/api/debts", { name: "Koper Test", initialAmount: 1000000, accountId: bca.id, moneyReceived: true });
assert(r.status === 201, "POST hutang baru + cair otomatis (201)");
const debt2 = r.json.data;
r = await req("GET", "/api/accounts");
assert(r.json.data.accounts.find((a) => a.id === bca.id).balance === bcaBefore + 1000000, "Saldo BCA naik 1jt saat hutang dicatat (cair otomatis)");
r = await req("GET", "/api/debts");
d = r.json.data.debts.find((x) => x.id === debt2.id);
console.log("   [debug] debt2:", JSON.stringify({ initialAmount: d.initialAmount, paidTotal: d.paidTotal, remaining: d.remaining }));
assert(d.remaining === 1000000, `Sisa pokok hutang baru = pokok (dapat ${d.remaining})`);

// PATCH parsial tidak menghapus field lain (regresi bug nullish)
r = await req("PATCH", `/api/debts/${debt.id}`, { note: "catatan uji" });
assert(r.status === 200 && r.json.data.dueDate !== null, "PATCH parsial hutang tidak menghapus dueDate");

// Pencairan manual (top-up) untuk hutang lama
r = await req("POST", `/api/debts/${debt.id}/disburse`, { amount: 2000000, accountId: bca.id, note: "cair paylater" });
assert(r.status === 201, "POST pencairan 2jt (201)");
r = await req("GET", "/api/debts");
d = r.json.data.debts.find((x) => x.id === debt.id);
assert(d.remaining === 4000000, `Top-up cair menambah pokok: sisa = 4.000.000 (dapat ${d.remaining})`);
r = await req("GET", "/api/accounts");
assert(r.json.data.accounts.find((a) => a.id === bca.id).balance === bcaBefore + 3000000, "Saldo BCA naik 2jt setelah cair manual (bukan income)");

r = await req("POST", `/api/debts/${debt.id}/pay`, { amount: 500000 });
assert(r.status === 201, "POST cicilan 500rb (201)");
r = await req("GET", "/api/debts");
d = r.json.data.debts.find((x) => x.id === debt.id);
assert(d.remaining === 3500000, `Sisa pokok = 3.500.000 (dapat ${d.remaining})`);
r = await req("GET", "/api/accounts");
assert(r.json.data.accounts.find((a) => a.id === bca.id).balance === bcaBefore + 2500000, "Saldo BCA turun 500rb");

r = await req("POST", `/api/debts/${debt.id}/pay`, { amount: 999999999 });
assert(r.status === 400, "Cicilan melebihi sisa pokok ditolak (400)");

r = await req("DELETE", `/api/debts/${debt.id}`);
assert(r.status === 409, "Hapus hutang yang punya transaksi ditolak (409)");

// Lunaskan (sisa 3.5jt)
r = await req("POST", `/api/debts/${debt.id}/pay`, { amount: 3500000 });
assert(r.status === 201 && r.json.data.settled === true, "Cicilan pelunasan -> SETTLED");
r = await req("GET", "/api/debts");
d = r.json.data.debts.find((x) => x.id === debt.id);
assert(d.status === "SETTLED" && d.remaining === 0, "Status hutang = SETTLED, sisa 0");
assert(r.json.data.totalRemaining === 1000000, "Total hutang berjalan = 1jt (hutang kedua)");

// Bayar hutang yang sudah lunas ditolak
r = await req("POST", `/api/debts/${debt.id}/pay`, { amount: 1000 });
assert(r.status === 400, "Bayar hutang lunas ditolak (400)");

r = await req("DELETE", `/api/debts/${debt2.id}`);
assert(r.status === 409, "Hapus hutang kedua ditolak (punya transaksi)");

// DEBT_PAYMENT tidak masuk pengeluaran bulanan
r = await req("GET", `/api/transactions?month=${new Date().toISOString().slice(0, 7)}`);
const monthExpense = r.json.data.transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
assert(monthExpense === 30000, `Agregat EXPENSE bulan ini = 30.000 (cicilan tidak terkotorkan, dapat ${monthExpense})`);
const debtTxs = r.json.data.transactions.filter((t) => t.type.startsWith("DEBT_"));
assert(debtTxs.length >= 4, `Transaksi DEBT_* tercatat (${debtTxs.length})`);

// ============ 5. KATEGORI FALLBACK & AKUN PROTECTED ============
console.log("\n=== 5. FALLBACK & PROTEKSI ===");
r = await req("DELETE", `/api/categories/${makan.id}`);
assert(r.status === 200, "DELETE kategori yang dipakai (fallback)");
r = await req("GET", `/api/transactions?month=${new Date().toISOString().slice(0, 7)}`);
const txMoved = r.json.data.transactions.find((t) => t.id === txExpense.id);
assert(txMoved && txMoved.category?.name === "Lain-lain", "Transaksi pindah ke kategori Lain-lain");

r = await req("DELETE", `/api/accounts/${bca.id}`);
assert(r.status === 409, "Hapus akun yang punya transaksi ditolak (409)");

r = await req("PATCH", `/api/accounts/${dana.id}`, { isActive: false });
assert(r.status === 200 && r.json.data.isActive === false, "Nonaktifkan akun kosong");
r = await req("DELETE", `/api/accounts/${dana.id}`);
assert(r.status === 200, "Hapus akun kosong berhasil");

// ============ SELESAI ============
console.log(`\n========================================`);
console.log(`HASIL: ${passed} lulus, ${failures.length} gagal`);
if (failures.length > 0) {
  console.error("Gagal:", failures);
  process.exit(1);
}
console.log("🎉 SEMUA SMOKE TEST LULUS");
