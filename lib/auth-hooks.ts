"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  isDemo: boolean;
  demoExpiresAt: string | null;
}

interface SubscriptionStatus {
  plan: string;
  status: "trial" | "pro" | "demo" | "expired";
  expiresAt: string | null;
  daysLeft: number;
  isDemo: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchAuth = useCallback(async () => {
    try {
      const [userRes, subRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/payments/subscription-status"),
      ]);

      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user);
      } else {
        setUser(null);
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData);
      }
    } catch (error) {
      console.error("Auth fetch error:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuth();
  }, [fetchAuth]);

  // `refresh` harus ambil ulang status auth (bukan cuma router.refresh),
  // supaya state `user` di client ikut ter-update — misalnya setelah logout
  // menu langsung berubah ke tampilan publik.
  const refresh = useCallback(async () => {
    router.refresh();
    await fetchAuth();
  }, [router, fetchAuth]);

  const hasAccess = subscription?.status !== "expired";
  const isPro = subscription?.status === "pro";
  const isTrial = subscription?.status === "trial";
  const isDemo = subscription?.status === "demo";

  return {
    user,
    subscription,
    loading,
    hasAccess,
    isPro,
    isTrial,
    isDemo,
    daysLeft: subscription?.daysLeft || 0,
    refresh,
  };
}

export function useRequireAuth(redirectTo = "/login") {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [user, loading, router, redirectTo]);

  return { user, loading };
}