import { db } from "@/lib/db";
import { handle, ok, fail, parseBody } from "@/lib/api";
import { categoryCreateSchema } from "@/lib/validators";
import { getUserIdFromRequest } from "@/lib/api-auth";

export async function GET(req: Request) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) return ok({ categories: [] });

    const categories = await db.category.findMany({
      where: { userId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: { _count: { select: { transactions: true } } },
    });
    return ok({ categories });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await getUserIdFromRequest(req as any);
    if (!userId) return fail(401, "Unauthorized");

    const input = await parseBody(req, categoryCreateSchema);
    const category = await db.category.create({ data: { ...input, userId } });
    return ok(category, { status: 201 });
  });
}
