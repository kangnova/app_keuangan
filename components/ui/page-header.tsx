"use client";

import { useLanguage } from "@/lib/i18n";
import type { Translations } from "@/lib/i18n/types";

type TitleFn = (t: Translations) => string;

export function PageHeader({
  titleKey,
  title,
  subtitle,
  children,
}: {
  titleKey?: TitleFn;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const { t } = useLanguage();
  const renderedTitle = titleKey ? titleKey(t) : title;

  return (
    <div className="flex items-center justify-between">
      <div>
        {renderedTitle && <h1 className="text-lg font-bold text-foreground">{renderedTitle}</h1>}
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
