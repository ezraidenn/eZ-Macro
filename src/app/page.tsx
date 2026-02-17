"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const userId = useStore((s) => s.userId);
  const setUserId = useStore((s) => s.setUserId);
  const onboarded = useStore((s) => s.onboarded);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        
        if (data.user) {
          setUserId(data.user.id);
          if (data.user.profile) {
            router.replace("/dashboard");
          } else {
            router.replace("/onboarding");
          }
        } else {
          setUserId(null);
          router.replace("/auth");
        }
      } catch {
        setUserId(null);
        router.replace("/auth");
      } finally {
        setChecking(false);
      }
    }

    checkAuth();
  }, [router, setUserId]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="h-8 w-8 animate-pulse rounded-full bg-emerald-500/20" />
    </div>
  );
}
