"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, BookOpen, Bot, Command, FileText, Home, Leaf, MapPin, Search, ShoppingBag, Sparkles, Truck, X } from "lucide-react";
import { useApp } from "@/components/providers";
import { ROLE_DASHBOARD_ROUTES } from "@/lib/constants";

const entries = [
  { label: "Homepage", detail: "The greener way forward", href: "/", icon: Home, keywords: "home landing ecotrace" },
  { label: "List a product", detail: "Photo, offer & sample wallet", href: "/dashboard/citizen?tab=marketplace", icon: ShoppingBag, keywords: "sell electronics quote money wallet payout listing product" },
  { label: "Schedule a pickup", detail: "Create a traceable collection", href: "/dashboard/citizen?tab=schedule", icon: Truck, keywords: "pickup booking address time device collect" },
  { label: "Scan e-waste with AI", detail: "Multi-device image identification", href: "/#ai-scanner", icon: Sparkles, keywords: "photo image laptop phone scanner ai vision" },
  { label: "Punjab collection hubs", detail: "Amritsar, Jalandhar, Phagwara & more", href: "/collection-centers", icon: MapPin, keywords: "near me center punjab mohali patiala ludhiana location map" },
  { label: "Live impact analytics", detail: "Real database sustainability data", href: "/impact", icon: BarChart3, keywords: "environment analytics charts stats impact recycling" },
  { label: "Product studio", detail: "Explore circular customer stories", href: "/marketplace", icon: ShoppingBag, keywords: "marketplace products buyback sample" },
  { label: "Tablet: complete journey", detail: "Photo to measured pickup, recycling and customer bill", href: "/journey/tablet", icon: Leaf, keywords: "tablet example payment received sample wallet trace story receipt" },
  { label: "Explore every dashboard", detail: "Open all six role portals", href: "/dashboards", icon: Home, keywords: "dashboard admin recycler partner citizen center organization portal" },
  { label: "How collection works", detail: "The complete process explained", href: "/how-it-works", icon: BookOpen, keywords: "delivery collection process faq steps" },
  { label: "Project documentation", detail: "Architecture, ER schema, API reference", href: "/docs", icon: FileText, keywords: "report pdf word academic lpu int252" },
  { label: "Chat with Tara AI", detail: "Ask in Hindi, Punjabi, English & more", href: "assistant", icon: Bot, keywords: "chatbot talk help language ai punjabi hindi" },
];

export function CommandPalette() {
  const router = useRouter();
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const dashboard = user ? [{ label: "My dashboard", detail: `Continue as ${user.role.replace("_", " ")}`, href: ROLE_DASHBOARD_ROUTES[user.role], icon: Leaf, keywords: "dashboard account profile overview" }] : [];
    return [...dashboard, ...entries].filter((item) => !q || `${item.label} ${item.detail} ${item.keywords}`.toLowerCase().includes(q)).slice(0, 9);
  }, [query, user]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen((v) => !v); }
      if (event.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("ecotrace:command-palette", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("ecotrace:command-palette", onOpen); };
  }, []);

  useEffect(() => { if (open) { const timer = window.setTimeout(() => inputRef.current?.focus(), 50); return () => window.clearTimeout(timer); } }, [open]);

  const navigate = (href: string) => {
    setOpen(false); setQuery(""); setSelected(0);
    if (href === "assistant") { window.dispatchEvent(new Event("ecotrace:open-assistant")); return; }
    router.push(href);
  };

  if (!open) return null;
  return <div className="fixed inset-0 z-[120] flex items-start justify-center bg-[#011b12]/65 px-3 pt-[10vh] backdrop-blur-md animate-fade-up" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }} role="presentation">
    <div className="w-full max-w-xl overflow-hidden rounded-[25px] border border-emerald-200/40 bg-white dark:bg-[#0d241b] shadow-[0_35px_100px_rgba(0,0,0,.34)] animate-assistant-in" role="dialog" aria-modal="true" aria-label="Quick navigation and search">
      <div className="flex items-center gap-3 border-b border-emerald-900/10 dark:border-emerald-500/15 px-5 py-4"><Search className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" /><input ref={inputRef} autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setSelected(0); }} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setSelected((v) => Math.min(v + 1, results.length - 1)); } if (event.key === "ArrowUp") { event.preventDefault(); setSelected((v) => Math.max(v - 1, 0)); } if (event.key === "Enter" && results[selected]) { event.preventDefault(); navigate(results[selected].href); } }} placeholder="Search pages, actions, hubs, AI..." className="min-w-0 flex-1 bg-transparent text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none" aria-label="Search commands" /><button type="button" onClick={() => setOpen(false)} aria-label="Close search" className="rounded-lg bg-slate-100 dark:bg-emerald-950 p-1.5 text-slate-500 dark:text-emerald-300"><X className="h-4 w-4" /></button></div>
      <div className="max-h-[58dvh] overflow-y-auto p-2"><p className="px-3 pb-2 pt-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-400">{query ? `${results.length} matching destination${results.length !== 1 ? "s" : ""}` : "Quick actions"}</p>{results.length === 0 ? <p className="p-8 text-center text-xs text-slate-500">No matching action. Try “pickup”, “Punjab”, “chat”, or “report”.</p> : results.map((item, index) => <button key={item.href} type="button" onClick={() => navigate(item.href)} onMouseEnter={() => setSelected(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${index === selected ? "bg-emerald-50 dark:bg-emerald-900/40" : "hover:bg-slate-50 dark:hover:bg-emerald-950/40"}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${index === selected ? "bg-emerald-700 text-white" : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"}`}><item.icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{item.label}</span><span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{item.detail}</span></span><ArrowRight className={`h-4 w-4 ${index === selected ? "text-emerald-700 dark:text-emerald-300" : "text-slate-300"}`} /></button>)}</div>
      <div className="flex items-center justify-between border-t border-emerald-900/10 dark:border-emerald-500/15 bg-[#f8fcf9] dark:bg-[#091b13] px-5 py-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400"><span className="flex items-center gap-1.5"><Command className="h-3 w-3" /> Press Ctrl/⌘ + K anywhere</span><span>↑ ↓ to navigate · Enter to open · Esc to close</span></div>
    </div>
  </div>;
}
