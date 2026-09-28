"use client";

import { useEffect, useState } from "react";
import { parseRupiah, formatThousand } from "@/lib/parse-amount";

export function AmountInput({
  value,
  onChange,
  placeholder = "0",
  autoFocus,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(value ? formatThousand(value) : "");

  useEffect(() => {
    // sinkron kalau nilai di-reset dari luar (mis. form ditutup/buka)
    setText(value ? formatThousand(value) : "");
  }, [value]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
        Rp
      </span>
      <input
        inputMode="numeric"
        autoFocus={autoFocus}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const n = parseRupiah(e.target.value);
          setText(e.target.value.trim() === "" ? "" : formatThousand(n));
          onChange(e.target.value.trim() === "" || n === 0 ? null : n);
        }}
        className="w-full rounded-xl border border-line bg-card py-3 pl-11 pr-3.5 text-right text-xl font-bold tabular-nums outline-none transition placeholder:font-normal placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </div>
  );
}
