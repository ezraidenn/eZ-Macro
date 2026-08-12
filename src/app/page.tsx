"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useStore, switchUserStore } from "@/lib/store";
import { syncUserDataFromServer } from "@/lib/sync";

export default function Home() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const setUserId = useAuthStore((s) => s.setUserId);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    // Wait for auth store to hydrate from localStorage before making decisions
    if (!hasHydrated) return;

    function routeAfterSync(status: "ok" | "unauthorized" | "error") {
      if (status === "unauthorized") {
        // Cookie expirada: a login, nunca a re-onboarding (el usuario ya tiene
        // cuenta; re-onboardear machacaría su perfil).
        setUserId(null);
        switchUserStore(null);
        router.replace("/auth");
        return;
      }
      if (useStore.getState().profile) {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding");
      }
    }

    async function checkAuth() {
      // If user is already in auth store (from persistence), load their data and redirect
      if (userId) {
        switchUserStore(userId);
        const result = await syncUserDataFromServer();
        routeAfterSync(result.status);
        return;
      }

      // No userId in store - check with server cookie
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();

        if (data.user) {
          setUserId(data.user.id);
          switchUserStore(data.user.id);
          const result = await syncUserDataFromServer();
          routeAfterSync(result.status);
        } else {
          setUserId(null);
          router.replace("/auth");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUserId(null);
        router.replace("/auth");
      }
    }

    checkAuth();
  }, [hasHydrated, router, setUserId, userId]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="h-8 w-8 animate-pulse rounded-full bg-emerald-500/20" />
    </div>
  );
}
