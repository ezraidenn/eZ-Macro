"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition, useMemo, memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import {
  LayoutDashboard,
  Camera,
  Scale,
  BarChart3,
  User,
} from "lucide-react";

const NavButton = memo(({ 
  item, 
  isActive, 
  onNavigate 
}: { 
  item: { href: string; icon: any; label: string }; 
  isActive: boolean; 
  onNavigate: (href: string) => void;
}) => (
  <button
    onClick={() => onNavigate(item.href)}
    className={cn(
      "relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors",
      isActive
        ? "text-emerald-400"
        : "text-muted-foreground active:text-foreground"
    )}
  >
    {isActive && (
      <motion.div
        layoutId="nav-indicator"
        className="absolute inset-0 rounded-xl bg-emerald-500/10"
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      />
    )}
    <item.icon
      className={cn("h-5 w-5 relative z-10", isActive && "stroke-[2.5]")}
    />
    <span className="text-[10px] font-medium relative z-10">
      {item.label}
    </span>
  </button>
));

NavButton.displayName = "NavButton";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useStore((s) => s.locale);
  const [isPending, startTransition] = useTransition();

  const NAV_ITEMS = useMemo(() => [
    { href: "/dashboard", icon: LayoutDashboard, label: t(locale, "nav.home") },
    { href: "/log", icon: Camera, label: t(locale, "nav.log") },
    { href: "/weight", icon: Scale, label: t(locale, "nav.weight") },
    { href: "/analytics", icon: BarChart3, label: t(locale, "nav.analytics") },
    { href: "/profile", icon: User, label: t(locale, "nav.profile") },
  ], [locale]);

  const handleNavigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/80 backdrop-blur-xl safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.href}
            item={item}
            isActive={pathname.startsWith(item.href)}
            onNavigate={handleNavigate}
          />
        ))}
      </div>
    </nav>
  );
}
