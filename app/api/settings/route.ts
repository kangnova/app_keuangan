import { handle, ok, fail, parseBody } from "@/lib/api";
import { settingsUpdateSchema } from "@/lib/validators";
import {
  SETTING_KEYS,
  getScanVisionModel,
  getScanMockMode,
  setSetting,
  resetSetting,
  VISION_MODEL_OPTIONS,
} from "@/lib/settings";
import { getUserIdFromRequest } from "@/lib/api-auth";
import { validateRequest } from "@/lib/auth";

export async function GET(req: Request) {
  return handle(async () => {
    const { user } = await validateRequest();
    if (!user || user.role !== "ADMIN") {
      return fail(403, "Akses ditolak. Pengaturan hanya untuk Administrator.");
    }

    const userId = user.id;

    const [vision, mock, apiKeySet] = await Promise.all([
      getScanVisionModel(userId),
      getScanMockMode(userId),
      Promise.resolve(!!process.env.SUMOPOD_API_KEY),
    ]);
    return ok({
      vision: { value: vision.value, source: vision.source, overridden: vision.overridden, options: VISION_MODEL_OPTIONS },
      mock: { enabled: mock.enabled, source: mock.source },
      apiKeySet,
    });
  });
}

export async function PUT(req: Request) {
  return handle(async () => {
    const { user } = await validateRequest();
    if (!user || user.role !== "ADMIN") {
      return fail(403, "Akses ditolak. Pengaturan hanya untuk Administrator.");
    }

    const userId = user.id;

    const body = await parseBody(req, settingsUpdateSchema);

    if (body.visionModel !== undefined) {
      if (body.visionModel === null) {
        await resetSetting(SETTING_KEYS.scanVisionModel, userId);
      } else {
        await setSetting(SETTING_KEYS.scanVisionModel, body.visionModel, userId);
      }
    }

    if (body.mockMode !== undefined) {
      if (body.mockMode === null) {
        await resetSetting(SETTING_KEYS.scanMockMode, userId);
      } else {
        await setSetting(SETTING_KEYS.scanMockMode, body.mockMode ? "1" : "0", userId);
      }
    }

    const [vision, mock] = await Promise.all([getScanVisionModel(userId), getScanMockMode(userId)]);
    return ok({
      vision: { value: vision.value, source: vision.source, overridden: vision.overridden },
      mock: { enabled: mock.enabled, source: mock.source },
    });
  });
}
