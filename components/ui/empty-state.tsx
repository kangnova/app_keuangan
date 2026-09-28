import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/10">
        <Icon className="size-6 text-muted" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {subtitle && <p className="max-w-60 text-xs text-muted">{subtitle}</p>}
    </div>
  );
}
