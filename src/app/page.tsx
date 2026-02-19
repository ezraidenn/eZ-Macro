"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const userId = useStore((s) => s.userId);
  const setUserId = useStore((s) => s.setUserId);
  const profile = useStore((s) => s.profile);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      // If user is already in store (from persistence), trust it and redirect immediately
      if (userId) {
        if (profile) {
          router.replace("/dashboard");
        } else {
          router.replace("/onboarding");
        }
        setChecking(false);
        return;
      }

      // Only check with server if no userId in store
      try {
        const res = await fetch("/api/auth/me", {
          credentials: 'include', // Ensure cookies are sent
        });
        const data = await res.json();
        
        if (data.user) {
          setUserId(data.user.id);
          if (data.user.profile) {
            router.replace("/dashboard");
          } else {
            router.replace("/onboarding");
          }
        } else {
          // No valid session on server
          setUserId(null);
          router.replace("/auth");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        // On network error, redirect to auth
        setUserId(null);
        router.replace("/auth");
      } finally {
        setChecking(false);
      }
    }

    checkAuth();
  }, [router, setUserId, userId, profile]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="h-8 w-8 animate-pulse rounded-full bg-emerald-500/20" />
    </div>
  );
}
