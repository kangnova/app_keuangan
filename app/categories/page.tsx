import { CategoriesClient } from "@/components/categories-client";

export const dynamic = "force-dynamic";

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Kategori</h1>
      <CategoriesClient />
    </div>
  );
}
