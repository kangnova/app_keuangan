import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const expenseCategories = [
  { name: "Makan & Minum", color: "#f97316", icon: "utensils" },
  { name: "Transportasi", color: "#3b82f6", icon: "bus" },
  { name: "Belanja", color: "#8b5cf6", icon: "shopping-cart" },
  { name: "Tagihan & Utilitas", color: "#eab308", icon: "receipt" },
  { name: "Hiburan", color: "#ec4899", icon: "clapperboard" },
  { name: "Kesehatan", color: "#22c55e", icon: "heart-pulse" },
  { name: "Pendidikan", color: "#06b6d4", icon: "graduation-cap" },
  { name: "Lain-lain", color: "#94a3b8", icon: "circle-ellipsis" },
];

const incomeCategories = [
  { name: "Gaji", color: "#16a34a", icon: "banknote" },
  { name: "Bonus", color: "#10b981", icon: "gift" },
  { name: "Usaha Sampingan", color: "#14b8a6", icon: "briefcase" },
  { name: "Hadiah", color: "#a3e635", icon: "party-popper" },
  { name: "Pendapatan Lain", color: "#84cc16", icon: "circle-dollar-sign" },
];

const accounts = [
  { name: "Dompet Cash", type: "CASH", initialBalance: 500_000, color: "#22c55e", icon: "wallet" },
  { name: "BCA", type: "BANK", initialBalance: 5_000_000, color: "#3b82f6", icon: "landmark" },
  { name: "GoPay", type: "EWALLET", initialBalance: 250_000, color: "#00aed6", icon: "smartphone" },
];

async function getOrCreateDefaultUser() {
  const defaultUserId = "clx_default_user_001";
  let user = await prisma.user.findUnique({ where: { id: defaultUserId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: defaultUserId,
        email: "demo@duitku.local",
        passwordHash: "$argon2id$v=19$m=19456,p=1,t=2$bwnylUFyBPxUkJJzYqg23w$QSQXOD+GNLSYZEjGfK0PQZ9OT6kGgAoVVY5kEoNU0pM",
        name: "Demo User",
        role: "ADMIN",
        plan: "TRIAL",
      },
    });
    console.log("   ✅ Default user created");
  }
  return user;
}

async function main() {
  const user = await getOrCreateDefaultUser();
  console.log(`🌱 Seeding untuk user: ${user.email} (${user.id})`);

  console.log("🌱 Seeding kategori preset...");
  for (const c of expenseCategories) {
    await prisma.category.upsert({
      where: { name_type_userId: { name: c.name, type: "EXPENSE", userId: user.id } },
      create: { ...c, type: "EXPENSE", isPreset: true, userId: user.id },
      update: {},
    });
  }
  for (const c of incomeCategories) {
    await prisma.category.upsert({
      where: { name_type_userId: { name: c.name, type: "INCOME", userId: user.id } },
      create: { ...c, type: "INCOME", isPreset: true, userId: user.id },
      update: {},
    });
  }
  console.log(`   ✅ ${expenseCategories.length} kategori pengeluaran + ${incomeCategories.length} kategori pemasukan`);

  console.log("🌱 Seeding akun contoh...");
  for (const a of accounts) {
    const existing = await prisma.account.findFirst({ where: { name: a.name, userId: user.id } });
    if (!existing) {
      await prisma.account.create({ data: { ...a, userId: user.id } });
      console.log(`   ➕ Akun baru: ${a.name}`);
    } else {
      console.log(`   ⏭️  Sudah ada: ${a.name}`);
    }
  }

  const [totalAccounts, totalCategories] = await Promise.all([
    prisma.account.count({ where: { userId: user.id } }),
    prisma.category.count({ where: { userId: user.id } }),
  ]);
  console.log(`\n✨ Seed selesai. Total: ${totalAccounts} akun, ${totalCategories} kategori.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());