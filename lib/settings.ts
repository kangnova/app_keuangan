import { db } from "@/lib/db";

/**
 * Preferensi aplikasi disimpan di tabel AppSetting (key-value) supaya bisa
 * diganti dari UI tanpa edit .env / redeploy. Nilai efektif:
 *   1. Nilai di DB (override per user) — kalau ada.
 *   2. Env var — fallback.
 *   3. Default bawaan kode — fallback terakhir.
 * API key SUMOPOD_API_KEY tetap di env (rahasia), tidak pernah disimpan di DB.
 */

export const SETTING_KEYS = {
  scanVisionModel: "scan_vision_model",
  scanMockMode: "scan_mock_mode",
} as const;

export type SettingSource = "db" | "env" | "default";

async function getRow(key: string, userId: string): Promise<string | null> {
  const row = await db.appSetting.findUnique({ where: { key_userId: { key, userId } } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string, userId: string): Promise<void> {
  await db.appSetting.upsert({
    where: { key_userId: { key, userId } },
    create: { key, value, userId },
    update: { value },
  });
}

/** value null = hapus override di DB (kembali ke env/default). */
export async function resetSetting(key: string, userId: string): Promise<void> {
  await db.appSetting.deleteMany({ where: { key, userId } });
}

// ===== Model vision scan =====

/** Whitelist longgar: biar model baru tetap bisa dipakai tanpa ganti kode. */
const MODEL_PATTERN = /^[a-zA-Z0-9._/-]{1,80}$/;

export const DEFAULT_VISION_MODEL = "gpt-4o-mini";

/** Daftar model umum di AI Gateway Sumopod untuk dropdown UI. */
export const VISION_MODEL_OPTIONS = [
  { value: "gpt-4o-mini", label: "GPT-4o mini — murah, cukup untuk struk jelas" },
  { value: "gpt-4o", label: "GPT-4o — paling akurat, lebih mahal" },
  { value: "gpt-4.1", label: "GPT-4.1 — akurat & cepat" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 mini — seimbang" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash — cepat & murah" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro — paling teliti" },
] as const;

export async function getScanVisionModel(userId: string): Promise<{
  value: string;
  source: SettingSource;
  overridden: boolean;
}> {
  const fromDb = await getRow(SETTING_KEYS.scanVisionModel, userId);
  if (fromDb && MODEL_PATTERN.test(fromDb.trim())) {
    return { value: fromDb.trim(), source: "db", overridden: true };
  }
  const fromEnv = process.env.SUMOPOD_VISION_MODEL;
  if (fromEnv && MODEL_PATTERN.test(fromEnv.trim())) {
    return { value: fromEnv.trim(), source: "env", overridden: false };
  }
  return { value: DEFAULT_VISION_MODEL, source: "default", overridden: false };
}

// ===== Mock mode scan =====

export async function getScanMockMode(userId: string): Promise<{ enabled: boolean; source: SettingSource }> {
  const fromDb = await getRow(SETTING_KEYS.scanMockMode, userId);
  if (fromDb === "1") return { enabled: true, source: "db" };
  if (fromDb === "0") return { enabled: false, source: "db" };
  if (process.env.SCAN_MOCK_MODE != null) {
    return { enabled: process.env.SCAN_MOCK_MODE === "1", source: "env" };
  }
  return { enabled: false, source: "default" };
}

export async function isScanMockMode(userId: string): Promise<boolean> {
  return (await getScanMockMode(userId)).enabled;
}