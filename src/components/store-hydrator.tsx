"use client";

import { useEffect, useRef } from "react";
import {
  useAuthStore,
  useStore,
  switchUserStore,
  isStoreHydrated,
} from "@/lib/store";
import { syncUserDataFromServer } from "@/lib/sync";

/**
 * Global store hydration component.
 * Ensures the per-user Zustand store is loaded from localStorage
 * and synced from the DB on every page load — not just on "/" or "/auth".
 *
 * Must be rendered inside the root layout so it runs on ALL pages.
 */
export function StoreHydrator() {
  const userId = useAuthStore((s) => s.userId);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const lastSyncedUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    console.log("[StoreHydrator] Effect running:", { hasHydrated, userId, isStoreHydrated: isStoreHydrated() });

    // Wait for auth store to hydrate from localStorage
    if (!hasHydrated) {
      console.log("[StoreHydrator] Waiting for auth store to hydrate...");
      return;
    }

    // Avoid re-running for the same userId
    if (lastSyncedUserId.current === userId) {
      console.log("[StoreHydrator] Already synced for this userId, skipping");
      return;
    }
    lastSyncedUserId.current = userId;

    if (!userId) {
      console.log("[StoreHydrator] No userId, resetting store");
      // Not logged in — reset store if it hasn't been already
      if (!isStoreHydrated()) return;
      switchUserStore(null);
      return;
    }

    // User is logged in — hydrate store from localStorage + DB
    if (!isStoreHydrated()) {
      console.log("[StoreHydrator] Hydrating store for user:", userId);
      switchUserStore(userId);
      console.log("[StoreHydrator] After switchUserStore, isStoreHydrated:", isStoreHydrated());
      console.log("[StoreHydrator] Current dayLogs:", useStore.getState().dayLogs);

      syncUserDataFromServer().then((success) => {
        console.log("[StoreHydrator] syncUserDataFromServer completed:", success);
        console.log("[StoreHydrator] dayLogs after sync:", useStore.getState().dayLogs);
      }).catch((err) => {
        console.error("[StoreHydrator] syncUserDataFromServer failed:", err);
      });
    } else {
      console.log("[StoreHydrator] Store already hydrated, skipping");
    }
  }, [hasHydrated, userId]);

  return null;
}
