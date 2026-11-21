"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, FileText, IndianRupee, Package, Search, ShieldCheck, Wallet, X } from "lucide-react";
import { useApp } from "@/components/providers";
import { formatINR } from "@/lib/constants";
import type { MarketplaceListing, MarketplacePayout } from "@/components/marketplace-workspace";

export function AdminMarketplace() {
  const { user, toast, fireConfetti } = useApp();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [payouts, setPayouts] = useState<MarketplacePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [quoteFor, setQuoteFor] = useState<MarketplaceListing | null>(null);
  const [rupees, setRupees] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, p] = await Promise.all([fetch("/api/listings", { cache: "no-store" }), fetch("/api/payouts", { cache: "no-store" })]);
      if (l.ok) setListings((await l.json()).listings || []);
      if (p.ok) setPayouts((await p.json()).payouts || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") return;
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [user, load]);

  const openQuote = (l: MarketplaceListing) => { setQuoteFor(l); setRupees(l.offeredAmountPaise ? String(l.offeredAmountPaise / 100) : String(l.indicativeValuePaise / 100)); setQuoteNotes(l.quoteNotes || "Sample offer subject to physical inspection, counted units and documented recycling."); };

  const submitQuote = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!quoteFor) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${quoteFor.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "quote", amountPaise: Math.round(Number(rupees) * 100), notes: quoteNotes }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not quote.");
      toast({ title: "Sample offer sent", description: `${formatINR(data.listing.offeredAmountPaise)} offered to the customer.`, variant: "success" });
      setQuoteFor(null); await load();
    } catch (e) { toast({ title: "Offer failed", description: e instanceof Error ? e.message : "Please retry", variant: "error" }); }
    finally { setBusy(false); }
  };

  const prepare = async (l: MarketplaceListing) => {
    setBusy(true);
    try {
      const res = await fetch("/api/payouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: l.id }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not prepare settlement.");
      toast({ title: "Sandbox settlement prepared", description: "Awaiting admin sign-off. No money was transferred.", variant: "success" });
      await load();
    } catch (e) { toast({ title: "Settlement blocked", description: e instanceof Error ? e.message : "Please retry", variant: "error" }); }
    finally { setBusy(false); }
  };

  const advance = async (p: MarketplacePayout, action: "approve" | "credit") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/payouts/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Settlement update failed.");
      if (action === "credit") fireConfetti();
      toast({ title: action === "approve" ? "Settlement approved" : "Sample wallet credited", description: action === "credit" ? "A simulated customer wallet entry was recorded. No real transfer occurred." : "Awaiting sandbox wallet credit.", variant: "success" });
      await load();
    } catch (e) { toast({ title: "Action blocked", description: e instanceof Error ? e.message : "Please retry", variant: "error" }); }
    finally { setBusy(false); }
  };

  const match = listings.filter((l) => !filter || `${l.listingCode} ${l.title} ${l.owner?.fullName} ${l.city} ${l.category}`.toLowerCase().includes(filter.toLowerCase()));
  const awaiting = listings.filter((l) => ["listed", "declined"].includes(l.status)).length;
  const ready = listings.filter((l) => l.status === "settlement_ready" && !l.settlement).length;
  const credited = payouts.filter((p) => p.status === "credited");

  return <div className="space-y-6 premium-section"><div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#063a2a] to-[#08724f] px-6 py-7 text-white shadow-xl"><div className="absolute -right-10 -top-20 h-60 w-60 rounded-full border-[32px] border-emerald-300/10 premium-orbit" /><p className="premium-kicker text-emerald-200">FINANCE / SANDBOX OPERATIONS</p><h2 className="mt-2 text-2xl sm:text-3xl font-extrabold premium-heading">Products, offers & settlements.</h2><p className="mt-2 max-w-xl text-sm text-emerald-100/75">A transparent admin-only path from customer product evidence to documented recovery and simulated wallet credit. Never a real funds transfer.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: "Customer products", value: listings.length, icon: Package, color: "text-emerald-600" },
      { label: "Awaiting reviewed offer", value: awaiting, icon: Clock3, color: "text-amber-600" },
      { label: "Ready for settlement", value: ready, icon: FileText, color: "text-sky-600" },
      { label: "Sample wallet credits", value: credited.length, icon: Wallet, color: "text-emerald-600" },
    ].map((m) => <div key={m.label} className="premium-card rounded-2xl p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-500">{m.label}</p><m.icon className={`h-4 w-4 ${m.color}`} /></div><p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">{m.value}</p></div>)}</div>
    <div className="premium-card rounded-3xl p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3 pb-4"><div><p className="premium-kicker text-emerald-700 dark:text-emerald-400">REVIEW WORKSPACE</p><h3 className="text-lg font-extrabold text-slate-950 dark:text-white">Customer photo listings</h3></div><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search products or customers" className="premium-form-field rounded-xl border border-emerald-900/10 dark:border-emerald-800 bg-[#f8faf8] dark:bg-[#0b2219] pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-white" /></div></div>
      <div className="space-y-2.5">{loading ? <div className="h-48 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 animate-pulse" /> : match.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No matching customer products.</p> : match.map((l) => <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-900/8 dark:border-emerald-500/15 bg-[#fafcf9] dark:bg-[#0e281f] p-3.5"><div className="h-17 w-17 shrink-0 overflow-hidden rounded-xl bg-emerald-100"><Image unoptimized width={1000} height={700} src={l.imageUrl} alt={l.title} className="h-full w-full object-cover" /></div><div className="min-w-[160px] flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400">{l.listingCode}</span><span className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 dark:text-emerald-200">{l.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{l.title}</p><p className="text-[11px] text-slate-500">{l.owner?.fullName} · {l.city} · {l.quantity} × {l.category} · {l.condition.replaceAll("_", " ")}</p><p className="text-[11px] text-slate-500">Indicative: {formatINR(l.indicativeValuePaise)} · Reviewed offer: <span className="font-bold text-emerald-800 dark:text-emerald-300">{formatINR(l.offeredAmountPaise)}</span></p></div><div className="flex flex-wrap items-center gap-2">{["listed", "quoted", "declined"].includes(l.status) && <button type="button" disabled={busy} onClick={() => openQuote(l)} className="rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white disabled:opacity-50">{l.status === "quoted" ? "Revise offer" : "Send sample offer"}</button>}{l.status === "settlement_ready" && !l.settlement && <button type="button" disabled={busy} onClick={() => void prepare(l)} className="rounded-xl bg-sky-700 px-3.5 py-2 text-xs font-bold text-white disabled:opacity-50">Prepare settlement</button>}{l.request && <span className="rounded-lg bg-white dark:bg-[#103225] border border-emerald-200 dark:border-emerald-700 px-2 py-1.5 text-[10px] font-mono font-bold text-slate-700 dark:text-emerald-200">{l.request.requestCode} · {l.request.status}</span>}{l.isDemoRecord && <span className="rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900">SAMPLE</span>}</div></div>)}</div>
    </div>
    <div className="premium-card rounded-3xl p-4 sm:p-6 space-y-4"><div><p className="premium-kicker text-emerald-700 dark:text-emerald-400">APPROVALS / WALLET LEDGER</p><h3 className="text-lg font-extrabold text-slate-950 dark:text-white">Settlement statements & approval queue</h3><p className="mt-1 text-xs text-slate-500">No settlement may be credited unless the pickup and recycler batch are documented and free of discrepancies.</p></div><div className="space-y-2">{payouts.length === 0 && <p className="py-7 text-center text-xs text-slate-500">No settlement records yet.</p>}{payouts.map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-900/8 dark:border-emerald-500/15 bg-[#f8fbf8] dark:bg-[#0e281f] px-4 py-3"><div><p className="font-mono text-xs font-bold text-slate-900 dark:text-white">{p.statementCode}</p><p className="text-[11px] text-slate-500">Offered {formatINR(p.quotedAmountPaise)} → confirmed {formatINR(p.finalAmountPaise)} · {p.status.replaceAll("_", " ")}</p></div><div className="flex items-center gap-2"><strong className="text-emerald-800 dark:text-emerald-300 text-sm">{formatINR(p.finalAmountPaise)}</strong><Link href={`/statement/${p.id}`} target="_blank" title="Open sandbox statement" className="rounded-lg border border-emerald-200 dark:border-emerald-700 p-2 text-emerald-800 dark:text-emerald-300"><FileText className="h-4 w-4" /></Link>{p.status === "pending_approval" && <button type="button" disabled={busy} onClick={() => void advance(p, "approve")} className="rounded-lg bg-sky-700 px-3 py-2 text-[11px] font-bold text-white">Approve</button>}{p.status === "approved" && <button type="button" disabled={busy} onClick={() => void advance(p, "credit")} className="rounded-lg bg-emerald-700 px-3 py-2 text-[11px] font-bold text-white">Credit sample wallet <ArrowRight className="inline-block h-3 w-3" /></button>}{p.status === "credited" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}</div></div>)}</div><p className="flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-[11px] font-semibold text-amber-900 dark:text-amber-200"><AlertCircle className="h-4 w-4 shrink-0" />This ledger is a demo wallet simulation. It cannot send money to a bank or generate a GST invoice.</p></div>
    {quoteFor && <div className="fixed inset-0 z-[65] flex items-center justify-center bg-[#01190f]/70 p-4 backdrop-blur-md"><form onSubmit={submitQuote} className="animate-assistant-in w-full max-w-md rounded-[26px] bg-white dark:bg-[#0e241b] p-6 shadow-2xl space-y-4"><div className="flex items-start justify-between"><div><p className="premium-kicker text-emerald-700">ADMIN REVIEW</p><h3 className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">Send a customer offer</h3></div><button type="button" onClick={() => setQuoteFor(null)} aria-label="Close offer form" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-emerald-950"><X className="h-5 w-5" /></button></div><p className="text-xs text-slate-500">{quoteFor.title} · {quoteFor.quantity} {quoteFor.category} · indicative guide {formatINR(quoteFor.indicativeValuePaise)}</p><div><label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">Offer total (₹, sample only)</label><div className="flex items-center rounded-xl border border-emerald-200 dark:border-emerald-800 bg-[#f8faf8] dark:bg-[#102b20] px-3"><IndianRupee className="h-4 w-4 text-emerald-700" /><input type="number" min={1} step="0.01" required value={rupees} onChange={(e) => setRupees(e.target.value)} className="w-full bg-transparent px-2 py-3 text-sm outline-none text-slate-900 dark:text-white" /></div></div><div><label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">Review & inspection notes</label><textarea maxLength={400} rows={3} value={quoteNotes} onChange={(e) => setQuoteNotes(e.target.value)} className="premium-form-field w-full resize-none rounded-xl border border-emerald-200 dark:border-emerald-800 bg-[#f8faf8] dark:bg-[#102b20] p-3 text-xs text-slate-900 dark:text-white" /></div><p className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300"><ShieldCheck className="h-3.5 w-3.5 shrink-0" />The offer is not a guarantee and must be accepted before pickup. Payout remains gated until documented recycling.</p><button type="submit" disabled={busy} className="w-full rounded-xl bg-emerald-700 py-3 text-xs font-bold text-white disabled:opacity-50">{busy ? "Sending…" : "Send sandbox offer"}</button></form></div>}
  </div>;
}
