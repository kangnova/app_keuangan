import { db } from "@/lib/db";
import { handle, ok, parseBody } from "@/lib/api";
import { categoryCreateSchema } from "@/lib/validators";

export async function GET() {
  return handle(async () => {
    const categories = await db.category.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: { _count: { select: { transactions: true } } },
    });
    return ok({ categories });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(req, categoryCreateSchema);
    const category = await db.category.create({ data: input });
    return ok(category, { status: 201 });
  });
}
