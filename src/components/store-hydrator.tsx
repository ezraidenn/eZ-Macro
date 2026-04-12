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
      syncUserDataFromServer().catch(() => {
        // Sync failed, but switchUserStore already loaded from localStorage
        // so we have at least cached data.
      });
    }
  }, [hasHydrated, userId]);

  return null;
}
