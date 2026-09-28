export const SUBSCRIPTION_PLANS = {
  pro_monthly: {
    id: "pro_monthly",
    name: "PRO Bulanan",
    price: 29000, // IDR
    period: "monthly",
    interval: 1,
    intervalUnit: "month",
    features: [
      "AI Scan Struk unlimited",
      "Export PDF/Excel/HTML unlimited",
      "Laporan lengkap semua periode",
      "Sinkronisasi multi-device",
      "Dukungan prioritas",
    ],
  },
  pro_yearly: {
    id: "pro_yearly",
    name: "PRO Tahunan",
    price: 290000, // IDR
    period: "yearly",
    interval: 1,
    intervalUnit: "year",
    features: [
      "Semua fitur PRO Bulanan",
      "Hemat ~17% (gratis 2 bulan)",
      "AI Scan Struk unlimited",
      "Export PDF/Excel/HTML unlimited",
      "Dukungan prioritas",
    ],
  },
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;

export function getPlan(planId: PlanId) {
  return SUBSCRIPTION_PLANS[planId];
}

export function getAllPlans() {
  return Object.values(SUBSCRIPTION_PLANS);
}