"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Leaf,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  Bell,
  Search,
} from "lucide-react";
import { useApp } from "@/components/providers";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/db/schema";

export interface NavTabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function DashboardShell({
  title,
  subtitle,
  allowedRoles,
  tabs,
  activeTab,
  onTabChange,
  headerActions,
  children,
}: {
  title: string;
  subtitle: string;
  allowedRoles: UserRole[];
  tabs: NavTabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, authLoading, theme, toggleTheme, logout, unreadNotifications } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const hasAccess = Boolean(user && allowedRoles.includes(user.role));
  useEffect(() => {
    if (authLoading || hasAccess) return;
    const target = `${pathname}${window.location.search}`;
    router.replace(`/login?redirect=${encodeURIComponent(target)}`);
  }, [authLoading, hasAccess, pathname, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6fbf8] dark:bg-[#07130f]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Loading EcoTrace Portal...
          </p>
        </div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6fbf8] dark:bg-[#07130f] p-4">
        <div className="max-w-md w-full rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-8 text-center shadow-xl space-y-4">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300"><Leaf className="h-6 w-6" /></div>
          <h1 className="text-xl font-extrabold text-slate-950 dark:text-white">Opening secure sign-in</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Sign in with your account to open the {title}. Your destination will be restored automatically.</p>
          <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className="inline-flex rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white">Continue to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f4faf6] dark:bg-[#07130f]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col sticky top-0 h-screen border-r border-emerald-900/10 dark:border-emerald-400/10 bg-[#052e22] text-emerald-50 transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-emerald-800/60">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
              <Leaf className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="block text-sm font-extrabold text-white truncate">
                  EcoTrace India
                </span>
                <span className="block text-[10px] uppercase tracking-wider text-emerald-300/80">
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-emerald-200/80 hover:bg-emerald-800/60"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                title={collapsed ? tab.label : undefined}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? "bg-emerald-500 text-emerald-950 shadow-md"
                    : "text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{tab.label}</span>}
                </div>
                {!collapsed && tab.badge != null && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      active
                        ? "bg-emerald-950 text-emerald-200"
                        : "bg-emerald-700 text-white"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-emerald-800/60 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-emerald-200/80 hover:bg-emerald-900/60 hover:text-white"
          >
            <Home className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Public Website</span>}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-200 hover:bg-rose-950/60"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-[#052e22] text-emerald-50 flex flex-col h-full shadow-2xl">
            <div className="h-16 px-4 flex items-center justify-between border-b border-emerald-800/60">
              <span className="font-extrabold text-white">EcoTrace India</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 text-emerald-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onTabChange(tab.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-3 rounded-xl text-sm font-semibold ${
                      active
                        ? "bg-emerald-500 text-emerald-950"
                        : "text-emerald-100 hover:bg-emerald-900/60"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </span>
                    {tab.badge != null && tab.badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-800 text-white">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-emerald-800/60 space-y-2">
              <Link
                href="/"
                className="block text-center py-2 rounded-xl bg-emerald-900/60 text-xs font-semibold text-emerald-100"
              >
                Return to Homepage
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2 rounded-xl bg-rose-900/60 text-xs font-semibold text-rose-100"
              >
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Responsive Topbar */}
        <header className="sticky top-0 z-30 h-16 border-b border-emerald-900/10 dark:border-emerald-400/10 bg-white/85 dark:bg-[#091813]/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-emerald-800 text-slate-700 dark:text-white"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white truncate">
                {title}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {headerActions}

            <button type="button" onClick={() => window.dispatchEvent(new Event("ecotrace:command-palette"))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-emerald-800 bg-white dark:bg-[#0d1f19] text-slate-700 dark:text-emerald-200" aria-label="Search all pages and actions" title="Search · Ctrl/⌘ + K"><Search className="h-4 w-4" /></button>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-emerald-800 bg-white dark:bg-[#0d1f19] text-slate-700 dark:text-emerald-200"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-emerald-800">
              <div className="text-right leading-tight">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {user.fullName}
                </p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                  {ROLE_LABELS[user.role]}
                </p>
              </div>
              {unreadNotifications > 0 && (
                <span
                  title={`${unreadNotifications} unread notification(s)`}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold"
                >
                  <Bell className="w-3 h-3" />
                  {unreadNotifications}
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
