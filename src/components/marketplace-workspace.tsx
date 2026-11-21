"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, CheckCircle2, ChevronRight, CircleHelp, ClipboardCheck, Clock3, FileText, ImagePlus, IndianRupee, LoaderCircle, MapPin, Package, Plus, Recycle, ShieldCheck, Sparkles, Trash2, Wallet, X } from "lucide-react";
import { useApp } from "@/components/providers";
import { EWASTE_CATEGORIES, PRODUCT_CONDITIONS, formatINR, getEstimatedUnitWeight, indicativeValuePaise, type ProductCondition } from "@/lib/constants";
import type { ListingStatus, SettlementStatus } from "@/db/schema";

export type MarketplaceListing = {
  id: number; listingCode: string; ownerId: number; requestId: number | null;
  title: string; brand: string | null; model: string | null;
  category: string; condition: ProductCondition; quantity: number;
  imageUrl: string; description: string | null; city: string; state: string;
  indicativeValuePaise: number; offeredAmountPaise: number | null;
  quoteNotes: string | null; status: ListingStatus; isDemoRecord: boolean; createdAt: string;
  request?: { requestCode: string; status: string; actualCollectedWeightKg: number | null; estimatedWeightKg: number; discrepancyFlag: boolean } | null;
  settlement?: MarketplacePayout | null;
  owner?: { fullName: string; email: string } | null;
};

export type MarketplacePayout = {
  id: number; statementCode: string; listingId: number; ownerId: number;
  quotedAmountPaise: number; finalAmountPaise: number;
  adjustmentReason: string | null; status: SettlementStatus;
  method: string; payoutReference: string | null; createdAt: string; creditedAt: string | null;
};

async function compressProductImage(file: File): Promise<string> {
  if (!/image\/(jpeg|png|webp)/.test(file.type)) throw new Error("Please choose a JPG, PNG or WEBP image.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Photo must be smaller than 8 MB.");
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 980 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error("Could not process image.")); return; }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      let result = canvas.toDataURL("image/jpeg", 0.7);
      if (result.length > 770000) result = canvas.toDataURL("image/jpeg", 0.42);
      URL.revokeObjectURL(objectUrl);
      if (result.length > 800000) reject(new Error("Photo is too complex. Please choose a smaller image."));
      else resolve(result);
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Could not read image.")); };
    image.src = objectUrl;
  });
}

const journey = [
  { label: "Listed", icon: Camera }, { label: "Offer", icon: IndianRupee }, { label: "Pickup", icon: Package },
  { label: "Verified", icon: ClipboardCheck }, { label: "Recycled", icon: Recycle }, { label: "Sample credit", icon: Wallet },
];

function progressForListing(l: MarketplaceListing): number {
  if (l.settlement?.status === "credited" || l.status === "paid") return 6;
  if (l.status === "settlement_ready" || l.settlement?.status === "approved" || l.settlement?.status === "pending_approval") return 5;
  if (l.status === "recycling") return 4;
  if (l.status === "verified") return 4;
  if (l.status === "collected") return 3;
  if (l.status === "pickup_booked") return 3;
  if (l.status === "accepted" || l.status === "quoted") return 2;
  return 1;
}

export function MarketplaceWorkspace({ isOrganization = false }: { isOrganization?: boolean }) {
  const { user, toast, fireConfetti } = useApp();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [payouts, setPayouts] = useState<MarketplacePayout[]>([]);
  const [balancePaise, setBalancePaise] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "attention" | "complete">("all");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState("Mobile Phones");
  const [condition, setCondition] = useState<ProductCondition>("repairable");
  const [qty, setQty] = useState(1);
  const [city, setCity] = useState(user?.city || "Ludhiana");
  const [state, setState] = useState(user?.state || "Punjab");
  const [description, setDescription] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, payRes] = await Promise.all([
        fetch("/api/listings", { cache: "no-store" }),
        fetch("/api/payouts", { cache: "no-store" }),
      ]);
      if (listRes.ok) setListings((await listRes.json()).listings || []);
      if (payRes.ok) { const body = await payRes.json(); setPayouts(body.payouts || []); setBalancePaise(body.balancePaise || 0); }
    } catch { toast({ title: "Could not load your marketplace", variant: "error" }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => { setCity(user.city || "Ludhiana"); setState(user.state || "Punjab"); void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [user?.id, refresh, user]);

  const uploadPhoto = async (file: File) => {
    try { setImageUrl(await compressProductImage(file)); }
    catch (e) { toast({ title: "Photo could not be used", description: e instanceof Error ? e.message : "Try another image.", variant: "error" }); }
  };

  const createListing = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!imageUrl) { toast({ title: "Add a product photo", description: "A real customer photo makes your listing complete.", variant: "warning" }); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: name, brand, model, category, condition, quantity: qty, city, state, description, imageDataUrl: imageUrl }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create listing.");
      fireConfetti();
      toast({ title: `${data.listing.listingCode} created`, description: "Your product is awaiting an admin-reviewed sample offer.", variant: "success" });
      setFormOpen(false); setName(""); setBrand(""); setModel(""); setDescription(""); setImageUrl(null); setQty(1);
      await refresh();
    } catch (e) { toast({ title: "Listing failed", description: e instanceof Error ? e.message : "Please try again.", variant: "error" }); }
    finally { setSaving(false); }
  };

  const updateOffer = async (l: MarketplaceListing, action: "accept_quote" | "decline_quote") => {
    try {
      const res = await fetch(`/api/listings/${l.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Offer update failed.");
      if (action === "accept_quote") fireConfetti();
      toast({ title: action === "accept_quote" ? "Sample offer accepted" : "Offer declined", description: action === "accept_quote" ? "Next: book a pickup to verify condition and weight." : "You can list another product anytime.", variant: "success" });
      await refresh();
    } catch (e) { toast({ title: "Could not update offer", description: e instanceof Error ? e.message : "Try again.", variant: "error" }); }
  };

  const bookLinkedPickup = (listing: MarketplaceListing) => {
    const payload = { items: [{ id: `listing-${listing.id}`, category: listing.category, quantity: listing.quantity, userCorrected: true, notes: `Linked product ${listing.listingCode} · ${listing.title}` }], imageDataUrl: listing.imageUrl.startsWith("data:") && listing.imageUrl.length < 1100000 ? listing.imageUrl : null, mode: "manual", summary: `Customer-listed product ${listing.listingCode} for pickup` };
    try { window.sessionStorage.setItem("ecotrace_pending_ai_items", JSON.stringify(payload)); window.sessionStorage.setItem("ecotrace_pending_listing_id", String(listing.id)); }
    catch { window.sessionStorage.setItem("ecotrace_pending_ai_items", JSON.stringify({ ...payload, imageDataUrl: null })); window.sessionStorage.setItem("ecotrace_pending_listing_id", String(listing.id)); }
    router.push("/dashboard/citizen?tab=schedule&fromListing=1");
  };

  const visible = listings.filter((l) => filter === "all" ? true : filter === "attention" ? ["quoted", "accepted", "listed"].includes(l.status) : l.status === "paid");
  const pending = listings.filter((l) => ["quoted", "accepted", "listed"].includes(l.status)).length;
  const indicative = indicativeValuePaise(category, condition, qty);

  return <div className="space-y-6 premium-section">
    {/* wallet masthead */}
    <div className="relative overflow-hidden rounded-[30px] bg-[#052e22] text-white p-6 sm:p-8 shadow-[0_20px_60px_rgba(4,62,39,.2)]">
      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[36px] border-emerald-500/15 premium-orbit" />
      <div className="absolute right-24 bottom-[-100px] h-52 w-52 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="premium-kicker text-emerald-300 flex items-center gap-2"><span className="inline-block h-1.5 w-1.5 rounded-full bg-lime-300 animate-pulse" />YOUR CIRCULAR ACCOUNT</p><h2 className="mt-3 text-3xl sm:text-4xl font-extrabold premium-heading">Your devices. <span className="text-lime-300">A better next chapter.</span></h2><p className="mt-3 max-w-xl text-sm text-emerald-100/75 leading-relaxed">From the first product photo to a documented recycling journey and a transparent sandbox wallet credit. Every step, beautifully accounted for.</p><p className="mt-3 text-[11px] font-bold text-amber-200">SAMPLE WALLET EXPERIENCE · No real payment or bank transfer is performed.</p></div>
        <div className="flex flex-wrap gap-2.5"><div className="min-w-[155px] rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"><p className="text-xs text-emerald-200">Sample wallet credited</p><p className="mt-1 text-2xl font-extrabold tracking-tight">{formatINR(balancePaise)}</p><p className="mt-1 text-[10px] text-emerald-200/70">Sandbox only · not withdrawable</p></div><div className="min-w-[110px] rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"><p className="text-xs text-emerald-200">My products</p><p className="mt-1 text-2xl font-extrabold">{listings.length}</p><p className="mt-1 text-[10px] text-emerald-200/70">{pending} need attention</p></div></div>
      </div>
    </div>

    {/* six-stage journey */}
    <div className="premium-card rounded-3xl p-5 sm:p-6"><div className="flex items-center justify-between mb-4"><div><p className="premium-kicker text-emerald-700 dark:text-emerald-400">HOW IT ALL CONNECTS</p><h3 className="text-lg font-extrabold text-slate-950 dark:text-white">One seamless circular journey</h3></div><span className="hidden sm:inline-flex rounded-full bg-amber-50 dark:bg-amber-950/30 px-3 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">6 recorded checkpoints · sample settlement</span></div><div className="grid grid-cols-3 sm:grid-cols-6 gap-2">{journey.map(({ label, icon: Icon }, i) => <div key={label} className="relative flex flex-col items-center gap-1.5 text-center"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"><Icon className="h-4 w-4" /></div><span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{label}</span>{i < 5 && <ChevronRight className="hidden sm:block absolute right-[-12px] top-3 h-4 w-4 text-emerald-300" />}</div>)}</div></div>

    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="premium-kicker text-emerald-700 dark:text-emerald-400">PERSONAL PRODUCT STUDIO</p><h2 className="text-2xl font-extrabold premium-heading text-slate-950 dark:text-white">{isOrganization ? "Your IT asset listings" : "My products & offers"}</h2><p className="text-sm text-slate-500 mt-1">Actual products and offer decisions are saved to your account.</p></div><button type="button" onClick={() => setFormOpen(true)} className="premium-button inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-800/20"><Plus className="h-4 w-4" />List a product</button></div>
    <div className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-[#0d1f19] border border-emerald-900/10 dark:border-emerald-500/15 p-1.5 w-fit">{(["all", "attention", "complete"] as const).map((type) => <button key={type} type="button" onClick={() => setFilter(type)} className={`rounded-lg px-4 py-2 text-xs font-bold capitalize transition ${filter === type ? "bg-emerald-700 text-white shadow" : "text-slate-500 hover:text-emerald-700"}`}>{type === "attention" ? `Needs attention (${pending})` : type === "complete" ? "Sample credited" : "All products"}</button>)}</div>
    {loading ? <div className="grid gap-4 lg:grid-cols-2">{[1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-3xl bg-emerald-100/60 dark:bg-emerald-900/30" />)}</div> : visible.length === 0 ? <div className="premium-card rounded-3xl p-12 text-center"><Package className="mx-auto h-9 w-9 text-emerald-500" /><h3 className="mt-3 font-bold text-slate-900 dark:text-white">No products in this view yet</h3><p className="mt-1 text-sm text-slate-500">List a product with a photo to see its complete journey here.</p><button type="button" onClick={() => setFormOpen(true)} className="mt-4 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white">Add my first product</button></div> : <div className="grid gap-4 xl:grid-cols-2">{visible.map((l) => <div key={l.id} className="premium-card group overflow-hidden rounded-[26px]"><div className="flex gap-4 p-4 sm:p-5"><div className="relative h-29 w-29 sm:h-34 sm:w-34 shrink-0 overflow-hidden rounded-2xl bg-[#eef6ed] dark:bg-[#11271f]"><Image unoptimized width={1000} height={700} src={l.imageUrl} alt={l.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />{l.isDemoRecord && <span className="absolute bottom-1.5 left-1.5 rounded-md bg-amber-400/95 px-1.5 py-0.5 text-[9px] font-black text-amber-950">SAMPLE</span>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-1"><span className="font-mono text-[10px] font-bold tracking-wider text-emerald-700 dark:text-emerald-400">{l.listingCode}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${l.status === "paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200" : l.status === "quoted" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200" : "bg-slate-100 text-slate-700 dark:bg-emerald-950 dark:text-emerald-200"}`}>{l.status === "paid" ? "Sample credit received" : l.status.replaceAll("_", " ")}</span></div><h3 className="mt-2 text-base font-extrabold leading-snug text-slate-950 dark:text-white line-clamp-2">{l.title}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{l.category} · {l.quantity} unit{l.quantity > 1 ? "s" : ""} · {l.condition.replaceAll("_", " ")}</p><p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-400"><MapPin className="h-3 w-3" />{l.city}, {l.state}</p><div className="mt-3 flex flex-wrap items-baseline gap-2"><span className="text-lg font-black text-emerald-800 dark:text-emerald-300">{l.offeredAmountPaise ? formatINR(l.offeredAmountPaise) : formatINR(l.indicativeValuePaise)}</span><span className="text-[10px] text-slate-500">{l.offeredAmountPaise ? "admin-reviewed sample offer" : "indicative demo guide only"}</span></div></div></div>
      <div className="mx-4 sm:mx-5 border-t border-emerald-900/8 dark:border-emerald-400/10 pt-3"><div className="flex items-center justify-between gap-2 pb-3">{journey.map(({ label }, i) => <div key={label} className="flex flex-1 flex-col items-center gap-1"><span className={`h-1.5 w-full rounded-full ${i < progressForListing(l) ? "bg-emerald-500" : "bg-slate-100 dark:bg-emerald-900/60"}`} /><span className="hidden sm:block text-[9px] font-semibold text-slate-400">{label}</span></div>)}</div>{l.request && <p className="pb-2 text-[11px] text-slate-500">Pickup <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{l.request.requestCode}</span> · {l.request.status.replaceAll("_", " ")} {l.request.actualCollectedWeightKg != null && `· ${l.request.actualCollectedWeightKg} kg physically collected`}</p>}{l.quoteNotes && <p className="pb-2 text-[11px] text-slate-500 italic line-clamp-2">{l.quoteNotes}</p>}</div>
      <div className="flex flex-wrap items-center gap-2 bg-emerald-50/65 dark:bg-emerald-950/30 px-4 sm:px-5 py-3">{l.status === "quoted" && <><button type="button" onClick={() => void updateOffer(l, "accept_quote")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />Accept sample offer</button><button type="button" onClick={() => void updateOffer(l, "decline_quote")} className="rounded-xl border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Decline</button></>}{l.status === "accepted" && <button type="button" onClick={() => bookLinkedPickup(l)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-600">Book linked pickup <ArrowRight className="h-3.5 w-3.5" /></button>}{l.settlement && <Link href={`/statement/${l.settlement.id}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white"><FileText className="h-3.5 w-3.5" />View settlement statement</Link>}{l.status === "listed" && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300"><Clock3 className="h-3.5 w-3.5" />Awaiting admin-reviewed offer</span>}{l.status === "settlement_ready" && !l.settlement && <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Recycling documented · awaiting settlement preparation</span>}{l.settlement?.status === "credited" && <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{formatINR(l.settlement.finalAmountPaise)} in sample wallet ✓</span>}{l.settlement?.status === "pending_approval" && <span className="text-xs font-semibold text-amber-700">Awaiting admin approval</span>}{!l.settlement && ["pickup_booked", "collected", "verified", "recycling"].includes(l.status) && <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Collection and recycling in progress · no payout yet</span>}</div></div>)}</div>}

    {/* wallet transaction history */}
    <div className="premium-card overflow-hidden rounded-[26px] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="premium-kicker text-emerald-700 dark:text-emerald-400">FINANCE / TRANSPARENCY</p><h3 className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">Sandbox wallet ledger</h3></div><span className="rounded-full bg-amber-50 dark:bg-amber-950/30 px-3 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-200">Not real money</span></div><p className="mt-1 text-xs leading-relaxed text-slate-500">Every statement is linked to an accepted offer, a physical pickup and documented recycling. Credited sample balances cannot be withdrawn.</p><div className="mt-5 space-y-2">{payouts.length ? payouts.map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-900/8 dark:border-emerald-500/15 bg-[#f8fbf8] dark:bg-[#0d241b] px-4 py-3"><div className="flex items-center gap-3"><div className={`grid h-10 w-10 place-items-center rounded-xl ${p.status === "credited" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200"}`}><IndianRupee className="h-4 w-4" /></div><div><p className="font-mono text-xs font-bold text-slate-900 dark:text-white">{p.statementCode}</p><p className="text-[11px] text-slate-500">{p.status === "credited" ? "Sample wallet credited" : p.status.replaceAll("_", " ")} · {new Date(p.createdAt).toLocaleDateString("en-IN")}</p></div></div><div className="flex items-center gap-3"><span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">{formatINR(p.finalAmountPaise)}</span><Link href={`/statement/${p.id}`} target="_blank" title="Open printable statement" className="rounded-lg border border-emerald-200 dark:border-emerald-800 p-2 text-emerald-800 dark:text-emerald-300"><FileText className="h-4 w-4" /></Link></div></div>) : <p className="rounded-2xl border border-dashed border-emerald-200 dark:border-emerald-800 p-6 text-center text-sm text-slate-500">No settlement entries yet. Your first eligible product will appear here after documented recycling.</p>}</div></div>

    {/* modal to create listing */}
    {formOpen && <div className="fixed inset-0 z-[65] flex items-center justify-center bg-[#02180f]/70 p-3 sm:p-5 backdrop-blur-md"><form onSubmit={createListing} className="animate-assistant-in flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] bg-white dark:bg-[#0d2119] shadow-[0_35px_100px_rgba(0,0,0,.3)]"><header className="flex items-center justify-between border-b border-emerald-900/10 dark:border-emerald-600/20 px-6 py-5"><div><p className="premium-kicker text-emerald-700 dark:text-emerald-400">CUSTOMER PRODUCT STUDIO</p><h3 className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white">Tell us what you&apos;re giving a new life</h3></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Close product form" className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-emerald-950"><X className="h-5 w-5" /></button></header>
      <div className="overflow-y-auto px-6 py-5 space-y-5"><div className="grid gap-5 md:grid-cols-[210px_1fr]"><div><p className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">Product photo <span className="text-rose-600">*</span></p><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && void uploadPhoto(e.target.files[0])} /><button type="button" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) void uploadPhoto(e.dataTransfer.files[0]); }} className="group relative grid aspect-square w-full place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-700 hover:border-emerald-600 transition">{imageUrl ? <><Image unoptimized width={1000} height={700} src={imageUrl} alt="Preview of product" className="h-full w-full object-cover" /><span className="absolute bottom-2 rounded-full bg-[#052e22]/85 px-3 py-1 text-xs font-bold text-white">Change photo</span></> : <span className="text-center text-xs font-bold"><ImagePlus className="mx-auto mb-2 h-8 w-8" />Upload or drop photo<br /><span className="font-normal">JPG / PNG / WEBP</span></span>}</button>{imageUrl && <button type="button" onClick={() => setImageUrl(null)} className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600"><Trash2 className="h-3 w-3" />Remove photo</button>}<p className="mt-2 text-[11px] leading-relaxed text-slate-500">Image is compressed in your browser and saved with your private listing.</p></div>
        <div className="space-y-3"><div><label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Give your product a name *</label><input required minLength={4} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My pre-loved laptop" className="premium-form-field w-full rounded-xl border border-emerald-900/15 dark:border-emerald-700 bg-[#f8faf8] dark:bg-[#102a20] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white" /></div><div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Brand</label><input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Optional" className="premium-form-field w-full rounded-xl border border-emerald-900/15 dark:border-emerald-700 bg-[#f8faf8] dark:bg-[#102a20] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white" /></div><div><label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Model</label><input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Optional" className="premium-form-field w-full rounded-xl border border-emerald-900/15 dark:border-emerald-700 bg-[#f8faf8] dark:bg-[#102a20] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Category *</label><select value={category} onChange={(e) => setCategory(e.target.value)} className="premium-form-field w-full rounded-xl border border-emerald-900/15 dark:border-emerald-700 bg-[#f8faf8] dark:bg-[#102a20] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white">{EWASTE_CATEGORIES.map((c) => <option key={c.id}>{c.id}</option>)}</select></div><div><label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Quantity *</label><input type="number" required min={1} max={50} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className="premium-form-field w-full rounded-xl border border-emerald-900/15 dark:border-emerald-700 bg-[#f8faf8] dark:bg-[#102a20] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white" /></div></div><div><p className="mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">Item condition *</p><div className="grid grid-cols-3 gap-2">{PRODUCT_CONDITIONS.map((c) => <button type="button" key={c.id} onClick={() => setCondition(c.id)} className={`rounded-xl border px-2 py-2.5 text-[11px] font-bold transition ${condition === c.id ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300" : "border-slate-200 text-slate-500 dark:border-emerald-800"}`}>{c.label}</button>)}</div></div><div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">City *</label><input required value={city} onChange={(e) => setCity(e.target.value)} className="premium-form-field w-full rounded-xl border border-emerald-900/15 dark:border-emerald-700 bg-[#f8faf8] dark:bg-[#102a20] px-3 py-2.5 text-sm text-slate-900 dark:text-white" /></div><div><label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">State *</label><input required value={state} onChange={(e) => setState(e.target.value)} className="premium-form-field w-full rounded-xl border border-emerald-900/15 dark:border-emerald-700 bg-[#f8faf8] dark:bg-[#102a20] px-3 py-2.5 text-sm text-slate-900 dark:text-white" /></div></div></div></div>
        <div><label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Anything else we should know?</label><textarea rows={2} maxLength={700} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Battery condition, accessories, privacy/data-wipe notes…" className="premium-form-field w-full resize-none rounded-xl border border-emerald-900/15 dark:border-emerald-700 bg-[#f8faf8] dark:bg-[#102a20] px-3 py-2.5 text-sm text-slate-900 dark:text-white" /></div>
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4"><CircleHelp className="h-5 w-5 shrink-0 text-amber-600" /><div><p className="text-xs font-extrabold text-amber-950 dark:text-amber-200">Indicative sandbox guide: {formatINR(indicative)}</p><p className="mt-0.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">Based on a demonstration category/condition schedule, not photo appraisal or a guaranteed offer. Admin review and physical inspection determine any final sample amount. Est. mass ~{(getEstimatedUnitWeight(category) * qty).toFixed(2)} kg; actual weight requires a scale.</p></div></div>
      </div><footer className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-900/10 dark:border-emerald-700/30 px-6 py-4"><span className="flex items-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />Photos are private to your account & operations</span><button disabled={saving} type="submit" className="premium-button flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{saving ? "Saving..." : "Create my listing"}</button></footer></form></div>}
  </div>;
}
