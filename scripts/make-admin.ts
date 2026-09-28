import { db } from "../lib/db";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run make-admin <email>");
    process.exit(1);
  }

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    console.error(`User dengan email '${email}' tidak ditemukan.`);
    process.exit(1);
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });

  console.log(`✅ Berhasil! User ${updated.name || updated.email} (${updated.email}) sekarang memiliki hak akses ADMIN.`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
