import Link from "next/link";
import { ScanLine, ChevronLeft } from "lucide-react";

export default function ScanPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <ScanLine className="size-8" />
      </div>
      <h1 className="text-lg font-bold">Scan Struk dengan AI</h1>
      <p className="max-w-72 text-sm text-muted">
        Fitur ini datang di <b>Milestone 4</b> — foto struk belanja, AI baca otomatis
        via Sumopod, lo tinggal review & simpan.
      </p>
      <Link href="/" className="mt-2 flex items-center gap-1 text-sm font-medium text-brand">
        <ChevronLeft className="size-4" /> Kembali ke Beranda
      </Link>
    </div>
  );
}
