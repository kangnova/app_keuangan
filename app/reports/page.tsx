import Link from "next/link";
import { BarChart3, ChevronLeft } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <BarChart3 className="size-8" />
      </div>
      <h1 className="text-lg font-bold">Laporan Keuangan</h1>
      <p className="max-w-72 text-sm text-muted">
        Fitur ini datang di <b>Milestone 3</b> — laporan harian/mingguan/bulanan/tahunan
        + export HTML/PDF/Excel.
      </p>
      <Link href="/" className="mt-2 flex items-center gap-1 text-sm font-medium text-brand">
        <ChevronLeft className="size-4" /> Kembali ke Beranda
      </Link>
    </div>
  );
}
