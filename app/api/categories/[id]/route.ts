import { db } from "@/lib/db";
import { handle, ok, notFound, fail, parseBody } from "@/lib/api";
import { categoryUpdateSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) return notFound("Kategori");
    const input = await parseBody(req, categoryUpdateSchema);
    const category = await db.category.update({ where: { id }, data: input });
    return ok(category);
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) return notFound("Kategori");

    const txCount = await db.transaction.count({ where: { categoryId: id } });
    if (txCount > 0) {
      const fallbackName = existing.type === "INCOME" ? "Pendapatan Lain" : "Lain-lain";
      if (existing.name === fallbackName) {
        return fail(409, `Kategori "${fallbackName}" masih dipakai transaksi, tidak bisa dihapus.`);
      }
      const fallback = await db.category.findFirst({
        where: { name: fallbackName, type: existing.type },
      });
      if (!fallback) return fail(409, "Kategori pengganti tidak ditemukan");
      await db.transaction.updateMany({ where: { categoryId: id }, data: { categoryId: fallback.id } });
    }

    await db.category.delete({ where: { id } });
    return ok({ deleted: id });
  });
}
