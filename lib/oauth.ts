import { Google } from "arctic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const google = new Google(
  process.env.GOOGLE_CLIENT_ID || "",
  process.env.GOOGLE_CLIENT_SECRET || "",
  `${appUrl}/api/auth/google/callback`
);

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_ID !== "your-google-client-id" &&
    process.env.GOOGLE_CLIENT_SECRET !== "your-google-client-secret"
  );
}
