import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { handle, ok, fail } from "@/lib/api";
import { validateRequest } from "@/lib/auth";

function appVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    return pkg.version ?? "?";
  } catch {
    return "?";
  }
}

function dbEngine(): string {
  const url = process.env.DATABASE_URL || "";
  if (url.startsWith("postgres")) return "PostgreSQL";
  if (url.startsWith("mysql")) return "MySQL";
  return "SQLite (file lokal)";
}

export async function GET() {
  return handle(async () => {
    const { user } = await validateRequest();
    if (!user || user.role !== "ADMIN") {
      return fail(403, "Akses ditolak. Khusus Administrator.");
    }

    const mem = process.memoryUsage();

    return ok({
      uptime: process.uptime(),
      systemUptime: os.uptime(),
      pid: process.pid,
      node: process.version,
      appVersion: appVersion(),
      env: process.env.NODE_ENV || "production",
      platform: `${os.platform()} / ${os.arch()}`,
      hostname: os.hostname(),
      cpus: os.cpus().length,
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      heapUsed: mem.heapUsed,
      rss: mem.rss,
      db: dbEngine(),
      time: new Date().toISOString(),
    });
  });
}
