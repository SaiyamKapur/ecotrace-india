"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Leaf,
  Sun,
  Moon,
  Menu,
  X,
  ArrowRight,
  LayoutDashboard,
  LogOut,
  Bell,
  Search,
} from "lucide-react";
import { useApp } from "@/components/providers";
import { ROLE_DASHBOARD_ROUTES, ROLE_LABELS } from "@/lib/constants";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/dashboards", label: "Dashboards" },
  { href: "/collection-centers", label: "Collection Centers" },
  { href: "/impact", label: "Impact" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme, user, unreadNotifications, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardHref = user ? ROLE_DASHBOARD_ROUTES[user.role] : "/login";
  const scheduleHref = user
    ? user.role === "citizen" || user.role === "organization"
      ? "/dashboard/citizen?tab=schedule"
      : ROLE_DASHBOARD_ROUTES[user.role]
    : "/login?redirect=/dashboard/citizen";

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-900/10 dark:border-emerald-400/10 bg-white/80 dark:bg-[#07130f]/85 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <Leaf className="w-5 h-5" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-lime-300 border-2 border-white dark:border-[#07130f]" />
            </div>
            <div className="leading-tight">
              <span className="block text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                EcoTrace <span className="text-emerald-600 dark:text-emerald-400">India</span>
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-wider text-emerald-700/80 dark:text-emerald-400/80">
                Circular E-Waste Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-2.5">
            <button type="button" onClick={() => window.dispatchEvent(new Event("ecotrace:command-palette"))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-emerald-800/60 bg-white dark:bg-[#0d1f19] text-slate-700 dark:text-emerald-200 hover:border-emerald-400 transition-colors" aria-label="Search site and actions" title="Quick search · Ctrl/⌘ + K"><Search className="h-4 w-4" /></button>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-emerald-800/60 bg-white dark:bg-[#0d1f19] text-slate-700 dark:text-emerald-200 hover:border-emerald-400 transition-colors"
              aria-label="Toggle color theme"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <>
                <Link
                  href={dashboardHref}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 text-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{ROLE_LABELS[user.role]}</span>
                  {unreadNotifications > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-600 text-white px-1.5 py-0.5 text-[10px] font-bold">
                      <Bell className="w-2.5 h-2.5" />
                      {unreadNotifications}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden xl:inline">Logout</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-950/50 transition-colors"
              >
                Login
              </Link>
            )}

            <Link
              href={scheduleHref}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-600 hover:from-emerald-700 hover:to-emerald-500 text-white text-sm font-semibold shadow-md shadow-emerald-700/20 transition-all hover:-translate-y-0.5"
            >
              <span>Schedule a Pickup</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Buttons */}
          <div className="flex xl:hidden items-center gap-2">
            <button type="button" onClick={() => window.dispatchEvent(new Event("ecotrace:command-palette"))} className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-emerald-800/60 bg-white dark:bg-[#0d1f19] text-slate-700 dark:text-emerald-200" aria-label="Search site and actions"><Search className="h-4 w-4" /></button>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-emerald-800/60 bg-white dark:bg-[#0d1f19] text-slate-700 dark:text-emerald-200"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-emerald-800/60 bg-white dark:bg-[#0d1f19] text-slate-800 dark:text-white"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-emerald-900/10 dark:border-emerald-400/10 bg-white dark:bg-[#091a14] px-4 pt-3 pb-5 space-y-2 shadow-xl">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                pathname === link.href
                  ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-semibold"
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/docs"
            onClick={() => setMobileOpen(false)}
            className="block px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Architecture & API Docs
          </Link>
          <div className="pt-2 border-t border-slate-200 dark:border-emerald-900 flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-semibold text-sm"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Open {ROLE_LABELS[user.role]} Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-medium text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="text-center py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold text-sm"
              >
                Login / Register
              </Link>
            )}
            <Link
              href={scheduleHref}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold text-sm"
            >
              Schedule a Pickup
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
