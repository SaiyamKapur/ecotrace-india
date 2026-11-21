"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Building2, CheckCircle2, LockKeyhole, MapPin, Recycle, ShieldCheck, ShoppingBag, Sparkles, Truck } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useApp } from "@/components/providers";
import { ROLE_DASHBOARD_ROUTES } from "@/lib/constants";
import type { UserRole } from "@/db/schema";

const portals: Array<{ role: UserRole; icon: React.ComponentType<{ className?: string }>; tag: string; title: string; points: string[]; accent: string }> = [
  { role: "citizen", icon: ShoppingBag, tag: "01 / YOUR JOURNEY", title: "Citizen dashboard", points: ["List and photograph devices", "Book pickup & track collection", "View wallet and statement"], accent: "from-emerald-700 to-teal-600" },
  { role: "partner", icon: Truck, tag: "02 / FIRST MILE", title: "Collection partner", points: ["Assigned pickup routes", "Physical quantity & scale weight", "Collection confirmation"], accent: "from-teal-700 to-cyan-600" },
  { role: "center_manager", icon: MapPin, tag: "03 / LOCAL HUB", title: "Center manager", points: ["Verify incoming items", "Manage Punjab collection points", "Dispatch recycler batches"], accent: "from-sky-700 to-blue-600" },
  { role: "recycler", icon: Recycle, tag: "04 / RECOVERY", title: "Recycler operations", points: ["Confirm gate receipt", "Document material processing", "Review discrepancies"], accent: "from-indigo-700 to-violet-600" },
  { role: "organization", icon: Building2, tag: "05 / ENTERPRISE", title: "Organization", points: ["Bulk device collections", "Internal material records", "Product & wallet visibility"], accent: "from-amber-700 to-orange-500" },
  { role: "admin", icon: BarChart3, tag: "06 / COMMAND CENTER", title: "Administrator", points: ["Assign & verify pickups", "Review offers and settlements", "Analytics and audit history"], accent: "from-[#064e3b] to-emerald-500" },
];

export default function DashboardsHubPage() {
  const { user } = useApp();
  const [kpis, setKpis] = useState<{ totalRequests: number; activeCentersCount: number; documentedBatchesCount: number } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/analytics?range=all", { cache: "no-store" });
        if (response.ok) setKpis((await response.json()).kpis);
      } catch { /* Portal navigation remains available without the KPI preview. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return <div className="min-h-screen flex flex-col"><Navbar /><main className="flex-1">
    <section className="relative overflow-hidden bg-gradient-to-br from-[#042c21] via-[#06563e] to-[#0c7657] py-15 sm:py-19 text-white"><div className="pointer-events-none absolute -right-25 -top-32 h-88 w-88 rounded-full border-[45px] border-lime-300/10 premium-orbit" /><div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/25 bg-white/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-emerald-100"><Sparkles className="h-3.5 w-3.5" /> SIX CONNECTED ROLE PORTALS</span><h1 className="mt-5 max-w-4xl text-4xl font-extrabold premium-heading sm:text-6xl">One platform. <span className="text-lime-300">Every perspective.</span></h1><p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-100/85">Choose your workspace, sign in with the corresponding account, and follow the same material journey through collection, verification, recycling and the recorded customer statement. Portal data stays protected by server-side role checks.</p><div className="mt-7 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-emerald-100/85"><span className="rounded-full bg-white/10 px-3 py-1.5">{kpis?.totalRequests ?? "…"} collection records</span><span className="rounded-full bg-white/10 px-3 py-1.5">{kpis?.activeCentersCount ?? "…"} sample hubs</span><span className="rounded-full bg-white/10 px-3 py-1.5">{kpis?.documentedBatchesCount ?? "…"} documented batches</span></div></div></section>
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="premium-kicker text-emerald-700 dark:text-emerald-400">CHOOSE YOUR WORKSPACE</p><h2 className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white sm:text-3xl">Role portals, protected by login.</h2></div><Link href="/journey/tablet" className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 px-4 py-2.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100">View the tablet journey <ArrowRight className="h-4 w-4" /></Link></div>
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{portals.map((portal) => { const href = user?.role === portal.role ? ROLE_DASHBOARD_ROUTES[portal.role] : `/login?redirect=${encodeURIComponent(ROLE_DASHBOARD_ROUTES[portal.role])}`; return <article key={portal.role} className="premium-card group flex flex-col overflow-hidden rounded-[26px]"><div className={`relative overflow-hidden bg-gradient-to-r ${portal.accent} p-5 text-white`}><div className="absolute -right-6 -top-10 h-35 w-35 rounded-full border-[20px] border-white/10 transition-transform duration-700 group-hover:rotate-45" /><div className="relative flex items-center justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl border border-white/25 bg-white/15"><portal.icon className="h-5 w-5" /></div><span className="font-mono text-[10px] font-bold tracking-wider text-white/80">{portal.tag}</span></div><h3 className="relative mt-5 text-xl font-extrabold">{portal.title}</h3></div><div className="flex flex-1 flex-col justify-between p-5"><ul className="space-y-2.5">{portal.points.map((point) => <li key={point} className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />{point}</li>)}</ul><Link href={href} className="premium-button mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#063b2b] px-4 py-2.5 text-xs font-extrabold text-white dark:bg-emerald-700"><LockKeyhole className="h-3.5 w-3.5" />{user?.role === portal.role ? "Open my workspace" : "Sign in to open"}<ArrowRight className="h-3.5 w-3.5" /></Link></div></article>; })}</div>
      <div className="mt-7 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 px-5 py-4 text-xs text-slate-600 dark:text-slate-300"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" /><span>Account credentials are not displayed on this public site. Enter them on the secure <Link href="/login" className="font-bold text-emerald-800 dark:text-emerald-300 underline">login page</Link>; project owners can find development account details in the separate project configuration file.</span></div>
    </section>
  </main><Footer /></div>;
}
