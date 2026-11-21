import React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, settlementRecords, productListings, pickupRequests, recyclingBatches, users } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { formatINR } from "@/lib/constants";
import { sampleStatementNote } from "@/lib/marketplace";
import { ensureSeeded } from "@/lib/seed";
import { PrintStatementButton } from "@/components/print-statement-button";

export const dynamic = "force-dynamic";

export default async function StatementPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureSeeded();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) redirect("/dashboard/citizen?tab=marketplace");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/statement/${id}`)}`);
  const [payout] = await db.select().from(settlementRecords).where(eq(settlementRecords.id, id)).limit(1);
  if (!payout || (payout.ownerId !== user.id && user.role !== "admin")) {
    return <div className="min-h-screen grid place-items-center p-8"><div className="text-center"><h1 className="text-2xl font-bold">Statement unavailable</h1><p className="my-4 text-sm">This statement is private to its owner.</p><Link href="/dashboard/citizen?tab=marketplace" className="text-emerald-700 underline">Back to your wallet</Link></div></div>;
  }
  const [[listing], [owner], [pickup]] = await Promise.all([
    db.select().from(productListings).where(eq(productListings.id, payout.listingId)).limit(1),
    db.select({ fullName: users.fullName, email: users.email, city: users.city, state: users.state }).from(users).where(eq(users.id, payout.ownerId)).limit(1),
    payout.requestId ? db.select().from(pickupRequests).where(eq(pickupRequests.id, payout.requestId)).limit(1) : Promise.resolve([]),
  ]);
  const [batch] = pickup?.batchId ? await db.select({ batchCode: recyclingBatches.batchCode, status: recyclingBatches.status, receivedWeightKg: recyclingBatches.receivedWeightKg, documentedRecyclingKg: recyclingBatches.documentedRecyclingKg }).from(recyclingBatches).where(eq(recyclingBatches.id, pickup.batchId)).limit(1) : [];

  return <main className="min-h-screen bg-[#eff8f2] dark:bg-[#07130f] py-8 sm:py-14 px-4 print:bg-white print:py-0 print:px-0">
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between print:hidden"><Link href="/dashboard/citizen?tab=marketplace" className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">← Back to products & wallet</Link><PrintStatementButton /></div>
      <article className="overflow-hidden rounded-[2rem] bg-white dark:bg-[#0e211a] shadow-2xl border border-emerald-900/10 dark:border-emerald-500/20 print:shadow-none print:border-none print:rounded-none">
        <header className="relative overflow-hidden bg-[#052d22] text-white px-7 sm:px-11 py-9">
          <div className="absolute -top-20 right-0 h-60 w-60 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[.25em] text-emerald-300 font-bold">EcoTrace India / Finance Desk</p><h1 className="mt-2 text-2xl sm:text-3xl font-extrabold">Settlement statement</h1><p className="mt-1 text-sm text-emerald-200">Customer-owned electronics recovery · sandbox ledger</p></div><div className="text-left sm:text-right"><p className="text-xs uppercase tracking-wider text-emerald-300">Statement number</p><p className="mt-1 font-mono font-bold">{payout.statementCode}</p><p className="mt-2 text-xs text-emerald-200">{new Date(payout.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p></div></div>
        </header>
        <div className="px-7 sm:px-11 py-8 space-y-8">
          <div className="rounded-2xl border-2 border-amber-400/70 bg-amber-50 dark:bg-amber-950/20 text-amber-950 dark:text-amber-200 p-4 text-xs font-bold leading-relaxed">{sampleStatementNote()}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><div><p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-2">Prepared for</p><p className="font-bold text-slate-900 dark:text-white">{owner?.fullName}</p><p className="text-sm text-slate-500">{owner?.email}</p><p className="text-sm text-slate-500">{owner?.city}, {owner?.state}</p></div><div className="sm:text-right"><p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-2">Demo settlement status</p><span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-3 py-1 text-sm font-bold">{payout.status === "credited" ? "Sample wallet credited" : payout.status.replaceAll("_", " ")}</span><p className="mt-2 text-xs text-slate-500">Method: Simulated EcoTrace wallet only</p></div></div>
          <div><h2 className="text-xs uppercase tracking-[.2em] text-emerald-700 dark:text-emerald-400 font-extrabold mb-4">01 / Product & image evidence</h2><div className="flex flex-col sm:flex-row gap-5 items-start rounded-2xl bg-[#f5faf6] dark:bg-[#091711] p-4"><div className="h-28 w-28 shrink-0 rounded-xl overflow-hidden bg-white"><Image unoptimized width={1000} height={700} src={listing?.imageUrl || "/images/listing-laptop.jpg"} alt="Listed customer product" className="h-full w-full object-cover" /></div><div className="flex-1"><p className="font-mono text-xs text-emerald-700">{listing?.listingCode}</p><p className="text-lg font-extrabold text-slate-900 dark:text-white">{listing?.title}</p><p className="text-sm text-slate-500">{listing?.category} · {listing?.brand || "Unbranded"} {listing?.model || ""}</p><p className="mt-2 text-xs text-slate-500">Condition: {listing?.condition.replaceAll("_", " ")} · Listed qty: {listing?.quantity} · Collected qty: {pickup?.actualCollectedQty ?? "pending"}</p></div></div></div>
          <div><h2 className="text-xs uppercase tracking-[.2em] text-emerald-700 dark:text-emerald-400 font-extrabold mb-4">02 / Verified material journey</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">{[
            ["Pickup reference", pickup?.requestCode ?? "—"], ["Estimated weight", pickup ? `~${pickup.estimatedWeightKg.toFixed(2)} kg` : "—"], ["Measured collection", pickup?.actualCollectedWeightKg != null ? `${pickup.actualCollectedWeightKg.toFixed(2)} kg` : "—"], ["Recycler gate weight", batch?.receivedWeightKg != null ? `${batch.receivedWeightKg.toFixed(2)} kg` : "—"],
          ].map(([title, value]) => <div key={title} className="rounded-xl border border-emerald-900/10 dark:border-emerald-500/20 p-3"><p className="text-slate-500">{title}</p><p className="mt-1 font-bold text-slate-900 dark:text-white break-all">{value}</p></div>)}</div><p className="text-xs text-slate-500 mt-3">Batch: {batch?.batchCode ?? "—"} · Documented recycled mass (entire batch): {batch?.documentedRecyclingKg != null ? `${batch.documentedRecyclingKg.toFixed(2)} kg` : "not documented"}. This amount is not attributable solely to this product.</p>{batch?.batchCode === "BATCH-2026-PGW-TABLET" && <Link href="/reports/tablet-recovery-log-sample.pdf" target="_blank" className="mt-3 inline-flex rounded-lg bg-emerald-100 dark:bg-emerald-900/60 px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">View sample recycler processing log ↗</Link>}</div>
          <div><h2 className="text-xs uppercase tracking-[.2em] text-emerald-700 dark:text-emerald-400 font-extrabold mb-4">03 / Settlement breakdown</h2><div className="divide-y divide-slate-100 dark:divide-emerald-900/60 text-sm"><div className="flex justify-between py-3 text-slate-600 dark:text-slate-300"><span>Admin-reviewed offered amount</span><strong>{formatINR(payout.quotedAmountPaise)}</strong></div><div className="flex justify-between py-3 text-slate-600 dark:text-slate-300"><span>Quantity adjustment</span><strong>{payout.finalAmountPaise < payout.quotedAmountPaise ? `−${formatINR(payout.quotedAmountPaise - payout.finalAmountPaise)}` : formatINR(0)}</strong></div><div className="flex justify-between py-4 text-lg font-extrabold text-slate-900 dark:text-white"><span>Final sample wallet credit</span><span className="text-emerald-700 dark:text-emerald-400">{formatINR(payout.finalAmountPaise)}</span></div></div><p className="mt-2 text-xs text-slate-500">{payout.adjustmentReason ?? "No quantity adjustment applied."}</p></div>
          <div className="flex flex-wrap justify-between gap-4 rounded-2xl bg-[#052d22] text-white p-5 text-xs"><div><p className="text-emerald-300 uppercase tracking-wider">Sandbox reference</p><p className="mt-1 font-mono font-bold">{payout.payoutReference ?? "Pending demo credit"}</p></div><div className="sm:text-right"><p className="text-emerald-300 uppercase tracking-wider">Recorded credit date</p><p className="mt-1 font-bold">{payout.creditedAt ? new Date(payout.creditedAt).toLocaleString("en-IN") : "Not yet credited"}</p></div></div>
          <p className="text-[11px] text-slate-500 leading-relaxed">Generated from persisted EcoTrace database records. This statement is not a GST invoice, government certificate, bank confirmation or evidence of an actual funds transfer. Real payout processing requires verified identity, a regulated payment provider, reconciliation and legal/compliance configuration.</p>
        </div>
      </article>
    </div>
  </main>;
}
