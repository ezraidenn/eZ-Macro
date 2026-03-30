"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Zap, Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const locale = useStore((s) => s.locale);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error(t(locale, "auth.emailRequired"));
      return;
    }

    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always show success — don't reveal if the email exists
      setSent(true);
    } catch {
      toast.error(t(locale, "auth.genericError"));
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
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold">
                {t(locale, "auth.checkEmail")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(locale, "auth.checkEmailDesc")}
              </p>
            </div>
            <button
              onClick={() => router.push("/auth")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-semibold transition-colors active:opacity-80"
            >
              <ArrowLeft className="h-4 w-4" />
              {t(locale, "auth.backToLogin")}
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-1 text-center">
              <p className="text-lg font-semibold">
                {t(locale, "auth.forgotPasswordTitle")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(locale, "auth.forgotPasswordDesc")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t(locale, "auth.email")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="input-field pl-10"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-black transition-colors active:bg-emerald-600 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t(locale, "auth.sendInstructions")
                )}
              </button>
            </form>

            <button
              onClick={() => router.push("/auth")}
              className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t(locale, "auth.backToLogin")}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
