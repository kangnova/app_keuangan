import { handle, ok, badRequest } from "@/lib/api";
import { buildReport, currentKey, isValidPeriodKey, type Period } from "@/lib/reports";

const PERIOD_VALUES = ["day", "week", "month", "year"];

export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const period = (url.searchParams.get("period") ?? "month") as Period;
    if (!PERIOD_VALUES.includes(period)) return badRequest("Periode harus: day, week, month, atau year");

    const key = url.searchParams.get("key") ?? currentKey(period);
    if (!isValidPeriodKey(period, key)) {
      return badRequest(
        period === "year"
          ? "Kunci tahun harus YYYY"
          : period === "month"
            ? "Kunci bulan harus YYYY-MM"
            : period === "week"
              ? "Kunci minggu harus YYYY-Www (cth: 2026-W39)"
              : "Kunci hari harus YYYY-MM-DD",
      );
    }

    const report = await buildReport(period, key);
    return ok(report);
  });
}
