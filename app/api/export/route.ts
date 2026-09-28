import { db } from "@/lib/db";
import { handle, badRequest } from "@/lib/api";
import { buildReport, currentKey, isValidPeriodKey, periodRange, type Period, type ReportData } from "@/lib/reports";
import { formatRupiah } from "@/lib/format";

const PERIOD_VALUES = ["day", "week", "month", "year"];

async function resolveReport(req: Request): Promise<ReportData | Response> {
  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "month") as Period;
  if (!PERIOD_VALUES.includes(period)) return badRequest("Periode harus: day, week, month, atau year");
  const key = url.searchParams.get("key") ?? currentKey(period);
  if (!isValidPeriodKey(period, key)) return badRequest("Kunci periode tidak valid");
  return buildReport(period, key);
}

function periodFilename(report: ReportData): string {
  return `laporan-${report.period}-${report.key}`;
}

async function exportExcel(report: ReportData): Promise<Response> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Duitku";

  const moneyFmt = '"Rp"#,##0';

  // ===== Sheet 1: Ringkasan =====
  const ws = wb.addWorksheet("Ringkasan");
  ws.columns = [{ width: 38 }, { width: 20 }];
  ws.addRows([
    ["LAPORAN KEUANGAN — DUITKU"],
    [report.label],
    [],
    ["RINGKASAN", ""],
    ["Pemasukan", report.summary.income],
    ["Pengeluaran", report.summary.expense],
    ["Surplus / Defisit", report.summary.net],
    ["Rata-rata keluar / hari aktif", report.summary.avgExpensePerActiveDay],
    ["Hari aktif (ada pengeluaran)", report.summary.activeDays],
    ["Jumlah transaksi", report.summary.txCount],
    [],
    ["HUTANG & TRANSFER (TERPISAH)", ""],
    ["Cicilan hutang dibayar", report.summary.debtPayment],
    ["Pencairan hutang", report.summary.debtDisbursement],
    ["Transfer antar akun", report.summary.transferTotal],
    [],
    ["KONDISI SAAT INI", ""],
    ...report.accounts.map((a) => [`Saldo ${a.name}`, a.balance] as [string, number]),
    ["Total saldo gabungan", report.accountsTotal],
    ["Total sisa hutang berjalan", report.totalDebt],
  ]);
  ws.getCell("A1").font = { bold: true, size: 14 };
  ["A4", "A12", "A16"].forEach((c) => (ws.getCell(c).font = { bold: true }));
  for (const row of ws.getRows(5, ws.rowCount) ?? []) {
    const b = row.getCell(2);
    if (typeof b.value === "number" && b.value > 100) b.numFmt = moneyFmt;
  }

  // ===== Sheet 2: Per Kategori =====
  const ws2 = wb.addWorksheet("Per Kategori");
  ws2.columns = [
    { header: "Kategori", key: "name", width: 30 },
    { header: "Jenis", key: "jenis", width: 14 },
    { header: "Total", key: "total", width: 18, style: { numFmt: moneyFmt } },
    { header: "Transaksi", key: "count", width: 12 },
    { header: "Persentase", key: "pct", width: 12, style: { numFmt: '0"%"' } },
  ];
  ws2.getRow(1).font = { bold: true };
  for (const c of report.expenseByCategory)
    ws2.addRow({ name: c.name, jenis: "Pengeluaran", total: c.total, count: c.count, pct: c.pct });
  ws2.addRow({});
  for (const c of report.incomeByCategory)
    ws2.addRow({ name: c.name, jenis: "Pemasukan", total: c.total, count: c.count, pct: c.pct });

  // ===== Sheet 3: Transaksi =====
  const ws3 = wb.addWorksheet("Transaksi");
  ws3.columns = [
    { header: "Tanggal", key: "date", width: 13 },
    { header: "Tipe", key: "type", width: 18 },
    { header: "Keterangan", key: "note", width: 40 },
    { header: "Kategori", key: "cat", width: 20 },
    { header: "Akun", key: "acc", width: 16 },
    { header: "Nominal", key: "amount", width: 16, style: { numFmt: moneyFmt } },
    { header: "Hutang", key: "debt", width: 20 },
  ];
  ws3.getRow(1).font = { bold: true };

  const { start, end } = periodRange(report.period, report.key);
  const TYPE_LABEL: Record<string, string> = {
    INCOME: "Pemasukan", EXPENSE: "Pengeluaran", TRANSFER: "Transfer",
    DEBT_PAYMENT: "Cicilan Hutang", DEBT_DISBURSEMENT: "Cair Hutang",
  };
  const txs = await db.transaction.findMany({
    where: { date: { gte: start, lt: end } },
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
      toAccount: { select: { name: true } },
      debt: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  for (const t of txs) {
    ws3.addRow({
      date: t.date.toISOString().slice(0, 10),
      type: TYPE_LABEL[t.type] ?? t.type,
      note: t.note ?? "",
      cat: t.toAccount ? `→ ${t.toAccount.name}` : (t.category?.name ?? ""),
      acc: t.account.name,
      amount: t.amount,
      debt: t.debt?.name ?? "",
    });
  }
  ws3.autoFilter = "A1:G1";

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${periodFilename(report)}.xlsx"`,
    },
  });
}

async function exportPdf(report: ReportData): Promise<Response> {
  // pdfmake 0.2.10 (dipin, 0.3.x hang di Node):
  // - build/pdfmake.js = library (punya createPdf)
  // - build/vfs_fonts.js = { pdfMake: { vfs: { 'Roboto-Regular.ttf': base64, ... } } }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMakeModule = (await import("pdfmake/build/pdfmake.js")) as { default?: any } & any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMake: any = (pdfMakeModule as { default?: unknown }).default ?? pdfMakeModule;
  const vfsModule = (await import("pdfmake/build/vfs_fonts.js")) as {
    pdfMake?: { vfs?: Record<string, unknown> };
    default?: { pdfMake?: { vfs?: Record<string, unknown> } };
  };
  const vfs = vfsModule?.pdfMake?.vfs ?? vfsModule?.default?.pdfMake?.vfs;
  if (vfs) {
    if (typeof pdfMake.addVirtualFileSystem === "function") pdfMake.addVirtualFileSystem(vfs);
    else pdfMake.vfs = vfs;
  }

  const s = report.summary;
  const money = (n: number) => formatRupiah(n);

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [36, 40, 36, 40],
    defaultStyle: { font: "Roboto", fontSize: 10 },
    content: [
      { text: "LAPORAN KEUANGAN — DUITKU", style: "title" },
      { text: report.label, style: "subtitle" },
      { text: `Dicetak: ${new Date().toLocaleString("id-ID")}`, style: "small", margin: [0, 0, 0, 12] },

      { text: "RINGKASAN", style: "h2" },
      {
        table: {
          widths: ["*", "auto"],
          body: [
            ["Pemasukan", money(s.income)],
            ["Pengeluaran", money(s.expense)],
            [{ text: s.net >= 0 ? "Surplus" : "Defisit", bold: true }, { text: money(s.net), bold: true }],
            ["Rata-rata keluar / hari aktif", money(s.avgExpensePerActiveDay)],
            ["Hari aktif", String(s.activeDays)],
            ["Jumlah transaksi", String(s.txCount)],
            ["Cicilan hutang (terpisah)", money(s.debtPayment)],
            ["Pencairan hutang (terpisah)", money(s.debtDisbursement)],
          ],
        },
      },

      { text: "PENGELUARAN PER KATEGORI", style: "h2", margin: [0, 14, 0, 4] },
      report.expenseByCategory.length === 0
        ? { text: "Tidak ada pengeluaran pada periode ini.", style: "small" }
        : {
            table: {
              widths: ["*", "auto", "auto", "auto"],
              body: [
                ["Kategori", "Total", "Trx", "%"],
                ...report.expenseByCategory.map((c) => [c.name, money(c.total), String(c.count), `${c.pct}%`]),
              ],
            },
          },

      { text: "PEMASUKAN PER KATEGORI", style: "h2", margin: [0, 14, 0, 4] },
      report.incomeByCategory.length === 0
        ? { text: "Tidak ada pemasukan pada periode ini.", style: "small" }
        : {
            table: {
              widths: ["*", "auto", "auto", "auto"],
              body: [
                ["Kategori", "Total", "Trx", "%"],
                ...report.incomeByCategory.map((c) => [c.name, money(c.total), String(c.count), `${c.pct}%`]),
              ],
            },
          },

      { text: "TOP PENGELUARAN", style: "h2", margin: [0, 14, 0, 4] },
      report.topExpenses.length === 0
        ? { text: "Tidak ada.", style: "small" }
        : {
            table: {
              widths: ["auto", "*", "auto", "auto"],
              body: [
                ["Tgl", "Keterangan", "Kategori", "Nominal"],
                ...report.topExpenses.map((t) => [
                  t.date.slice(5),
                  t.note ?? "(tanpa catatan)",
                  t.categoryName ?? "-",
                  money(t.amount),
                ]),
              ],
            },
          },

      { text: "KONDISI SAAT INI", style: "h2", margin: [0, 14, 0, 4] },
      {
        table: {
          widths: ["*", "auto"],
          body: [
            ...report.accounts.map((a) => [`Saldo ${a.name}`, money(a.balance)]),
            [{ text: "Total saldo gabungan", bold: true }, { text: money(report.accountsTotal), bold: true }],
            ["Total sisa hutang berjalan", money(report.totalDebt)],
          ],
        },
      },
    ],
    styles: {
      title: { fontSize: 16, bold: true },
      subtitle: { fontSize: 12, color: "#059669", margin: [0, 2, 0, 2] },
      small: { fontSize: 9, italics: true, color: "#64748b" },
      h2: { fontSize: 11, bold: true, color: "#059669" },
    },
  };

  // Node-safe: getBuffer dengan timeout, supaya kegagalan render tidak menggantung request
  const buf = await new Promise<Buffer>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout membuat PDF")), 20000);
    try {
      pdfMake.createPdf(docDefinition).getBuffer((b: Buffer) => {
        clearTimeout(timer);
        resolve(b);
      });
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${periodFilename(report)}.pdf"`,
    },
  });
}

async function exportHtml(report: ReportData): Promise<Response> {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const money = (n: number) => formatRupiah(n);
  const s = report.summary;

  const rows = (items: { name: string; total: number; count: number; pct: number }[]) =>
    items.length === 0
      ? `<tr><td colspan="4" class="empty">Tidak ada data</td></tr>`
      : items
          .map(
            (c) =>
              `<tr><td>${esc(c.name)}</td><td class="num">${money(c.total)}</td><td class="num">${c.count}</td><td class="num">${c.pct}%</td></tr>`,
          )
          .join("");

  const txRows = report.topExpenses
    .map(
      (t) =>
        `<tr><td>${t.date.slice(5)}</td><td>${esc(t.note ?? "(tanpa catatan)")}</td><td>${esc(t.categoryName ?? "-")}</td><td class="num">${money(t.amount)}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<title>Laporan ${esc(report.label)} — Duitku</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #14181f; margin: 0; background: #f6f7f9; }
  .page { max-width: 720px; margin: 24px auto; background: #fff; padding: 36px 44px; border-radius: 12px; }
  h1 { font-size: 20px; margin: 0; }
  .sub { color: #059669; font-weight: 600; margin: 4px 0 2px; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 20px; }
  h2 { font-size: 12px; letter-spacing: .08em; color: #059669; margin: 26px 0 8px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th, td { padding: 7px 8px; border-bottom: 1px solid #e5e9ef; text-align: left; }
  th { font-size: 10.5px; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .empty { color: #94a3b8; font-style: italic; }
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0 4px; }
  .card { background: #f6f7f9; border-radius: 10px; padding: 12px 14px; }
  .card .lbl { font-size: 10.5px; color: #64748b; }
  .card .val { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; margin-top: 2px; }
  .in .val { color: #059669; } .out .val { color: #e11d48; }
  .print-btn { position: fixed; top: 18px; right: 18px; background: #059669; color: #fff; border: 0;
    border-radius: 10px; padding: 10px 18px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgb(5 150 105 / .35); }
  @media print { .print-btn { display: none; } body { background: #fff; } .page { margin: 0; border-radius: 0; padding: 12px 4px; } }
</style></head>
<body>
<button class="print-btn" onclick="window.print()">🖨 Cetak / Simpan PDF</button>
<div class="page">
  <h1>LAPORAN KEUANGAN — DUITKU</h1>
  <p class="sub">${esc(report.label)}</p>
  <p class="meta">Dicetak: ${new Date().toLocaleString("id-ID")}</p>

  <div class="cards">
    <div class="card in"><div class="lbl">Pemasukan</div><div class="val">${money(s.income)}</div></div>
    <div class="card out"><div class="lbl">Pengeluaran</div><div class="val">${money(s.expense)}</div></div>
    <div class="card"><div class="lbl">${s.net >= 0 ? "Surplus" : "Defisit"}</div><div class="val">${money(s.net)}</div></div>
    <div class="card"><div class="lbl">Rata-rata / hari aktif</div><div class="val">${money(s.avgExpensePerActiveDay)}</div></div>
  </div>

  <h2>Ringkasan</h2>
  <table>
    <tr><th>Keterangan</th><th class="num">Nilai</th></tr>
    <tr><td>Hari aktif (ada pengeluaran)</td><td class="num">${s.activeDays} hari</td></tr>
    <tr><td>Jumlah transaksi</td><td class="num">${s.txCount}</td></tr>
    <tr><td>Cicilan hutang (diluar pengeluaran)</td><td class="num">${money(s.debtPayment)}</td></tr>
    <tr><td>Pencairan hutang (diluar pemasukan)</td><td class="num">${money(s.debtDisbursement)}</td></tr>
    <tr><td>Transfer antar akun</td><td class="num">${money(s.transferTotal)}</td></tr>
  </table>

  <h2>Pengeluaran per Kategori</h2>
  <table><tr><th>Kategori</th><th class="num">Total</th><th class="num">Trx</th><th class="num">%</th></tr>${rows(report.expenseByCategory)}</table>

  <h2>Pemasukan per Kategori</h2>
  <table><tr><th>Kategori</th><th class="num">Total</th><th class="num">Trx</th><th class="num">%</th></tr>${rows(report.incomeByCategory)}</table>

  <h2>Top Pengeluaran</h2>
  <table><tr><th>Tgl</th><th>Keterangan</th><th>Kategori</th><th class="num">Nominal</th></tr>${
    txRows || '<tr><td colspan="4" class="empty">Tidak ada pengeluaran</td></tr>'
  }</table>

  <h2>Kondisi Saat Ini</h2>
  <table>
    ${report.accounts.map((a) => `<tr><td>Saldo ${esc(a.name)}</td><td class="num">${money(a.balance)}</td></tr>`).join("")}
    <tr><td><b>Total saldo gabungan</b></td><td class="num"><b>${money(report.accountsTotal)}</b></td></tr>
    <tr><td>Total sisa hutang berjalan</td><td class="num">${money(report.totalDebt)}</td></tr>
  </table>
</div>
</body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "html";

    const resolved = await resolveReport(req);
    if (resolved instanceof Response) return resolved;
    const report = resolved;

    if (format === "xlsx") return exportExcel(report);
    if (format === "pdf") return exportPdf(report);
    if (format === "html") return exportHtml(report);
    return badRequest("Format harus: xlsx, pdf, atau html");
  });
}
