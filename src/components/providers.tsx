"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import type { SafeUser } from "@/lib/auth";

type Theme = "light" | "dark";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: "success" | "error" | "info" | "warning";
}

interface AppContextValue {
  theme: Theme;
  toggleTheme: () => void;
  user: SafeUser | null;
  unreadNotifications: number;
  authLoading: boolean;
  refreshAuth: () => Promise<SafeUser | null>;
  setUser: React.Dispatch<React.SetStateAction<SafeUser | null>>;
  logout: () => Promise<void>;
  toast: (t: Omit<ToastItem, "id">) => void;
  fireConfetti: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside Providers");
  return ctx;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [user, setUser] = useState<SafeUser | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // System-aware theme init
  useEffect(() => {
    const saved = window.localStorage.getItem("ecotrace-theme") as Theme | null;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: Theme = saved || (systemDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", initial === "dark");
    const timer = window.setTimeout(() => setTheme(initial), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Register PWA service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem("ecotrace-theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
        setUnreadNotifications(data.unreadNotifications ?? 0);
        return data.user ?? null;
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshAuth();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshAuth]);

  const toast = useCallback((t: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setUnreadNotifications(0);
      toast({
        title: "Signed out successfully",
        description: "Your session has been cleared.",
        variant: "info",
      });
    } catch {
      toast({
        title: "Sign out failed",
        variant: "error",
      });
    }
  }, [toast]);

  const fireConfetti = useCallback(() => {
    if (typeof window === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.remove();
      return;
    }

    const colors = ["#10b981", "#059669", "#34d399", "#fbbf24", "#38bdf8", "#a7f3d0"];
    const particles = Array.from({ length: 70 }, () => ({
      x: canvas.width * (0.25 + Math.random() * 0.5),
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 4,
      size: Math.random() * 7 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.25,
      alpha: 1,
    }));

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.32;
        p.rotation += p.vRot;
        p.alpha = Math.max(0, p.alpha - 0.012);
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        ctx.restore();
      }
      frame += 1;
      if (frame < 90) {
        requestAnimationFrame(draw);
      } else {
        canvas.remove();
      }
    };
    requestAnimationFrame(draw);
  }, []);

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        user,
        unreadNotifications,
        authLoading,
        refreshAuth,
        setUser,
        logout,
        toast,
        fireConfetti,
      }}
    >
      {children}

      {/* Floating Toast Container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 left-4 z-[90] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto glass-card rounded-2xl p-4 shadow-xl flex items-start gap-3 transition-all duration-300"
          >
            {t.variant === "success" && (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            )}
            {t.variant === "error" && (
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            {t.variant === "warning" && (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            {t.variant === "info" && (
              <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t.title}
              </p>
              {t.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((i) => i.id !== t.id))}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}
