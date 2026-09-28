import { db } from "@/lib/db";
import { handle, ok, notFound, fail } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const scan = await db.receiptScan.findUnique({ where: { id } });
    if (!scan) return notFound("Scan");
    if (scan.status !== "PENDING") {
      return fail(409, `Scan sudah diproses (status: ${scan.status})`);
    }
    await db.receiptScan.update({ where: { id }, data: { status: "DISCARDED" } });
    return ok({ discarded: id });
  });
}
