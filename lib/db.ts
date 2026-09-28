import { PrismaClient } from "@prisma/client";

// Singleton pattern: di dev, Next.js hot-reload modul dan membuat koneksi baru
// setiap kali file ini di-import ulang. Menyimpan instance di globalThis mencegah
// connection pool membengkak. Di production, global ini diabaikan.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
