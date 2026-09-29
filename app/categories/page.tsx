import { CategoriesClient } from "@/components/categories-client";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader titleKey={(t) => t.categories.title} />
      <CategoriesClient />
    </div>
  );
}
