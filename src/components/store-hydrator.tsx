"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  useAuthStore,
  useStore,
  switchUserStore,
  isStoreHydrated,
} from "@/lib/store";
import { syncUserDataFromServer } from "@/lib/sync";
import { formatDateKey } from "@/lib/utils";

/**
 * Global store hydration component.
 * Ensures the per-user Zustand store is loaded from localStorage
 * and synced from the DB on every page load — not just on "/" or "/auth".
 *
 * Must be rendered inside the root layout so it runs on ALL pages.
 */
export function StoreHydrator() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const userId = useAuthStore((s) => s.userId);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const lastSyncedUserId = useRef<string | null | undefined>(undefined);

  // ── Rollover de fecha ────────────────────────────────────────────────
  // Una PWA suspendida y reabierta al día siguiente conservaba currentDate
  // viejo y las comidas nuevas se registraban en ayer. Al volver a foreground,
  // si el día cambió y el usuario estaba viendo "hoy", avanzar al hoy nuevo.
  useEffect(() => {
    let lastKnownToday = formatDateKey(new Date());

    const handleWake = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const newToday = formatDateKey(new Date());
      if (newToday !== lastKnownToday) {
        const { currentDate, setCurrentDate } = useStore.getState();
        // Solo auto-avanzar si estaba en el "hoy" anterior (respetar la
        // navegación manual a fechas pasadas)
        if (currentDate === lastKnownToday) {
          setCurrentDate(newToday);
        }
        lastKnownToday = newToday;
      }
    };

    document.addEventListener("visibilitychange", handleWake);
    window.addEventListener("focus", handleWake);
    return () => {
      document.removeEventListener("visibilitychange", handleWake);
      window.removeEventListener("focus", handleWake);
    };
  }, []);

  // ── Hidratación + sync ───────────────────────────────────────────────
  useEffect(() => {
    // Wait for auth store to hydrate from localStorage
    if (!hasHydrated) return;

    // Avoid re-running for the same userId
    if (lastSyncedUserId.current === userId) return;
    lastSyncedUserId.current = userId;

    if (!userId) {
      // Not logged in — reset store if it hasn't been already
      if (!isStoreHydrated()) return;
      switchUserStore(null);
      return;
    }

    // User is logged in — hydrate store from localStorage + DB
    if (!isStoreHydrated()) {
      switchUserStore(userId);

      syncUserDataFromServer()
        .then((result) => {
          if (result.status === "unauthorized") {
            // Cookie expirada/inválida: cerrar sesión local y mandar a login
            // en vez de dejar una app "zombie" cuyos guardados fallan.
            useAuthStore.getState().setUserId(null);
            switchUserStore(null);
            router.replace("/auth");
            return;
          }
          if (result.theme) {
            setTheme(result.theme);
          }
        })
        .catch((err) => {
          console.error("[StoreHydrator] sync failed:", err);
        });
    }
  }, [hasHydrated, userId, router, setTheme]);

  return null;
}
