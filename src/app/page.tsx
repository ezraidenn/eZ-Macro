"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useStore, switchUserStore } from "@/lib/store";
import { syncUserDataFromServer } from "@/lib/sync";

export default function Home() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const setUserId = useAuthStore((s) => s.setUserId);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const profile = useStore((s) => s.profile);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Wait for auth store to hydrate from localStorage before making decisions
    if (!hasHydrated) return;

    async function checkAuth() {
      // If user is already in auth store (from persistence), load their data and redirect
      if (userId) {
        switchUserStore(userId);
        // Always sync from server to restore meals, weights, and profile
        // even if profile is cached in localStorage
        const synced = await syncUserDataFromServer();
        setChecking(false);
        if (synced && useStore.getState().profile) {
          router.replace("/dashboard");
        } else {
          router.replace("/onboarding");
        }
        return;
      }

      // No userId in store - check with server cookie
      try {
        const res = await fetch("/api/auth/me", {
          credentials: 'include',
        });
        const data = await res.json();
        
        if (data.user) {
          setUserId(data.user.id);
          switchUserStore(data.user.id);
          
          // Sync all user data from server
          const synced = await syncUserDataFromServer();
          if (synced && useStore.getState().profile) {
            router.replace("/dashboard");
          } else {
            router.replace("/onboarding");
          }
        } else {
          setUserId(null);
          router.replace("/auth");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUserId(null);
        router.replace("/auth");
      } finally {
        setChecking(false);
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
