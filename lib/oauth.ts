import { Google } from "arctic";
import { APP_URL } from "@/lib/app-url";

export const google = new Google(
  process.env.GOOGLE_CLIENT_ID || "",
  process.env.GOOGLE_CLIENT_SECRET || "",
  `${APP_URL}/api/auth/google/callback`
);

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_ID !== "your-google-client-id" &&
    process.env.GOOGLE_CLIENT_SECRET !== "your-google-client-secret"
  );
}
