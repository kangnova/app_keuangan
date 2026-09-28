import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { Lucia, Session, User } from "lucia";
import { db } from "@/lib/db";
import { cache } from "react";

const adapter = new PrismaAdapter(db.session, db.user);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production",
    },
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      name: attributes.name,
      role: attributes.role,
      plan: attributes.plan,
      trialEndsAt: attributes.trialEndsAt,
      subscriptionEndsAt: attributes.subscriptionEndsAt,
      isDemo: attributes.isDemo,
      demoExpiresAt: attributes.demoExpiresAt,
    };
  },
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  email: string;
  name: string | null;
  role: string;
  plan: string;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
  isDemo: boolean;
  demoExpiresAt: Date | null;
}

export const validateRequest = cache(
  async (): Promise<{ user: User; session: Session } | { user: null; session: null }> => {
    const sessionId = lucia.readSessionCookie();
    if (!sessionId) {
      return { user: null, session: null };
    }

    const result = await lucia.validateSession(sessionId);
    try {
      if (result.session && result.session.fresh) {
        lucia.setSessionCookie(result.session.id);
      }
      if (!result.session) {
        lucia.deleteSessionCookie();
      }
    } catch {}
    return result;
  }
);

export async function createDemoUser() {
  const demoId = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 hari

  const user = await db.user.create({
    data: {
      id: demoId,
      email: `${demoId}@demo.duitku.local`,
      passwordHash: "demo_no_password",
      name: "Demo User",
      role: "USER",
      plan: "TRIAL",
      isDemo: true,
      demoExpiresAt: expiresAt,
      trialEndsAt: expiresAt,
    },
  });

  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  return { user, session, sessionCookie };
}

export async function convertDemoToRealUser(demoUserId: string, email: string, passwordHash: string, name: string) {
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const user = await db.user.update({
    where: { id: demoUserId },
    data: {
      email,
      passwordHash,
      name,
      isDemo: false,
      demoExpiresAt: null,
      trialEndsAt: expiresAt,
    },
  });

  return user;
}