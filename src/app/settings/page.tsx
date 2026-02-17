"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Sun, Moon, Globe, LogOut, ChevronLeft } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const locale = useStore((s) => s.locale);
  const setLocale = useStore((s) => s.setLocale);
  const setUserId = useStore((s) => s.setUserId);
  const setOnboarded = useStore((s) => s.setOnboarded);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUserId(null);
    setOnboarded(false);
    router.replace("/auth");
  }

  async function handleLocaleChange(newLocale: Locale) {
    setLocale(newLocale);
    try {
      await fetch("/api/sync/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: newLocale }),
      });
    } catch {}
  }

  async function handleThemeChange(newTheme: string) {
    setTheme(newTheme);
    try {
      await fetch("/api/sync/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch {}
  }

  return (
    <AppShell>
      <div className="px-4 pt-6 safe-top space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-bold">{t(locale, "settings.title")}</h1>
        </div>

        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-xs font-medium text-muted-foreground">
            {t(locale, "settings.appearance")}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleThemeChange("light")}
              className={cn(
                "flex flex-1 flex-col items-center gap-2 rounded-2xl p-4 transition-all",
                theme === "light"
                  ? "bg-emerald-500/10 ring-1 ring-emerald-500/30"
                  : "bg-secondary/50"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/10">
                <Sun className="h-5 w-5 text-amber-500" />
              </div>
              <span className="text-xs font-medium">
                {t(locale, "settings.lightMode")}
              </span>
            </button>
            <button
              onClick={() => handleThemeChange("dark")}
              className={cn(
                "flex flex-1 flex-col items-center gap-2 rounded-2xl p-4 transition-all",
                theme === "dark"
                  ? "bg-emerald-500/10 ring-1 ring-emerald-500/30"
                  : "bg-secondary/50"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                <Moon className="h-5 w-5 text-indigo-400" />
              </div>
              <span className="text-xs font-medium">
                {t(locale, "settings.darkMode")}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Language */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">
              {t(locale, "settings.language")}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleLocaleChange("es")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all",
                locale === "es"
                  ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "bg-secondary/50 text-muted-foreground"
              )}
            >
              🇲🇽 {t(locale, "settings.spanish")}
            </button>
            <button
              onClick={() => handleLocaleChange("en")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all",
                locale === "en"
                  ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "bg-secondary/50 text-muted-foreground"
              )}
            >
              🇺🇸 {t(locale, "settings.english")}
            </button>
          </div>
        </motion.div>

        {/* Account */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <p className="text-xs font-medium text-muted-foreground">
            {t(locale, "settings.account")}
          </p>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 text-sm font-medium text-red-400 active:bg-red-500/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {t(locale, "auth.logout")}
          </button>
        </motion.div>

        <div className="h-4" />
      </div>
    </AppShell>
  );
}
