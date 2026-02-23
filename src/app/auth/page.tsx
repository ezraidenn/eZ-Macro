"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, useAuthStore, switchUserStore } from "@/lib/store";
import { syncUserDataFromServer } from "@/lib/sync";
import { t } from "@/lib/i18n";
import { Zap, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AuthPage() {
  const router = useRouter();
  const locale = useStore((s) => s.locale);
  const setUserId = useAuthStore((s) => s.setUserId);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error(t(locale, "auth.emailRequired"));
      return;
    }
    if (password.length < 6) {
      toast.error(t(locale, "auth.passwordMin"));
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      toast.error(t(locale, "auth.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe: mode === "login" ? rememberMe : false }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(
          mode === "login"
            ? t(locale, "auth.loginError")
            : data.error || t(locale, "auth.registerError")
        );
        return;
      }

      setUserId(data.userId);
      switchUserStore(data.userId);

      if (mode === "login" && data.hasProfile) {
        // Sync all user data from server (profile, meals, weights)
        const synced = await syncUserDataFromServer();
        if (synced && useStore.getState().profile) {
          router.replace("/dashboard");
        } else {
          router.replace("/onboarding");
        }
      } else {
        router.replace("/onboarding");
      }
    } catch {
      toast.error(mode === "login" ? t(locale, "auth.loginError") : t(locale, "auth.registerError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
            <Zap className="h-7 w-7 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">eZMacro</h1>
          <p className="text-sm text-muted-foreground">
            {t(locale, "auth.subtitle")}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-secondary p-1">
          <button
            onClick={() => setMode("login")}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
              mode === "login"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            {t(locale, "auth.login")}
          </button>
          <button
            onClick={() => setMode("register")}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
              mode === "register"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            {t(locale, "auth.register")}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t(locale, "auth.email")}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="input-field pl-10 relative z-10"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t(locale, "auth.password")}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-0" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-10 pr-10 relative z-10"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground z-20"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {mode === "register" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5 overflow-hidden"
              >
                <label className="text-xs font-medium text-muted-foreground">
                  {t(locale, "auth.confirmPassword")}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-0" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-10 relative z-10"
                    autoComplete="new-password"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Remember Me - Only for login */}
          {mode === "login" && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-secondary text-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:ring-offset-0"
              />
              <label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer">
                {t(locale, "auth.rememberMe")}
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-black transition-colors active:bg-emerald-600 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {mode === "login" ? t(locale, "auth.login") : t(locale, "auth.register")}
              </>
            )}
          </button>
        </form>

        {/* Switch mode */}
        <p className="text-center text-xs text-muted-foreground">
          {mode === "login" ? t(locale, "auth.noAccount") : t(locale, "auth.hasAccount")}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="font-semibold text-emerald-400"
          >
            {mode === "login" ? t(locale, "auth.register") : t(locale, "auth.login")}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
