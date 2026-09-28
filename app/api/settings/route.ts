import { handle, ok, parseBody } from "@/lib/api";
import { settingsUpdateSchema } from "@/lib/validators";
import {
  SETTING_KEYS,
  getScanVisionModel,
  getScanMockMode,
  setSetting,
  resetSetting,
  VISION_MODEL_OPTIONS,
} from "@/lib/settings";

export async function GET() {
  return handle(async () => {
    const [vision, mock, apiKeySet] = await Promise.all([
      getScanVisionModel(),
      getScanMockMode(),
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
    const body = await parseBody(req, settingsUpdateSchema);

    if (body.visionModel !== undefined) {
      if (body.visionModel === null) {
        await resetSetting(SETTING_KEYS.scanVisionModel);
      } else {
        await setSetting(SETTING_KEYS.scanVisionModel, body.visionModel);
      }
    }

    if (body.mockMode !== undefined) {
      if (body.mockMode === null) {
        await resetSetting(SETTING_KEYS.scanMockMode);
      } else {
        await setSetting(SETTING_KEYS.scanMockMode, body.mockMode ? "1" : "0");
      }
    }

    // Balikin state efektif terbaru
    const [vision, mock] = await Promise.all([getScanVisionModel(), getScanMockMode()]);
    return ok({
      vision: { value: vision.value, source: vision.source, overridden: vision.overridden },
      mock: { enabled: mock.enabled, source: mock.source },
    });
  });
}
