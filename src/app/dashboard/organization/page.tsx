"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FileCheck2,
  Building2,
  ShieldCheck,
  ArrowRight,
  Package,
  ShoppingBag,
} from "lucide-react";
import { MarketplaceWorkspace } from "@/components/marketplace-workspace";
import { DashboardShell } from "@/components/dashboard-shell";
import { useApp } from "@/components/providers";
import {
  AnimatedCounter,
  PickupStatusBadge,
} from "@/components/ui-primitives";
import type { PickupStatus } from "@/db/schema";

interface EprRecordRow {
  id: number;
  recordCode: string;
  reportingPeriod: string;
  category: string;
  requestedQty: number;
  estimatedWeightKg: number;
  actualCollectedWeightKg: number;
  recyclerReceivedWeightKg: number;
  processedQty: number;
  documentedRecyclingKg: number;
  supportingDocsCount: number;
  verificationStatus: string;
  notes: string | null;
}

interface OrgPickupRow {
  id: number;
  requestCode: string;
  status: PickupStatus;
  requestedTotalQty: number;
  estimatedWeightKg: number;
  actualCollectedWeightKg: number | null;
  city: string;
  state: string;
  preferredDate: string;
}

export default function OrganizationDashboardPage() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState("epr");
  const [records, setRecords] = useState<EprRecordRow[]>([]);
  const [pickups, setPickups] = useState<OrgPickupRow[]>([]);

  const loadData = useCallback(async () => {
    const [eRes, pRes] = await Promise.all([
      fetch("/api/epr", { cache: "no-store" }),
      fetch("/api/pickups", { cache: "no-store" }),
    ]);
    if (eRes.ok) {
      const d = await eRes.json();
      setRecords(d.records || []);
    }
    if (pRes.ok) {
      const d = await pRes.json();
      setPickups(d.requests || []);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user, loadData]);

  const totalCollected = records.reduce((s, r) => s + r.actualCollectedWeightKg, 0);
  const totalReceived = records.reduce((s, r) => s + r.recyclerReceivedWeightKg, 0);
  const totalDocumented = records.reduce((s, r) => s + r.documentedRecyclingKg, 0);

  return (
    <DashboardShell
      title="Organization & Producer EPR Portal"
      subtitle="Track bulk organizational e-waste collections and transparent non-statutory EPR traceability logs"
      allowedRoles={["organization", "admin"]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={[
        { id: "epr", label: "EPR Traceability Ledger", icon: FileCheck2 },
        { id: "marketplace", label: "IT Products & Sample Wallet", icon: ShoppingBag },
        { id: "pickups", label: "Organization Pickups", icon: Package },
      ]}
      headerActions={
        <Link
          href="/dashboard/citizen?tab=schedule"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold"
        >
          Schedule Bulk Pickup
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      }
    >
      <div className="mb-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 p-4 flex items-start gap-3 text-xs text-emerald-950 dark:text-emerald-200">
        <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
        <p><strong>Internal material tracking:</strong> Requested, collected, received and processed quantities remain separate. For statutory EPR decisions, consult the applicable regulatory process.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5">
          <p className="text-xs font-semibold text-slate-500">Actual Collected Weight</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">
            <AnimatedCounter value={totalCollected} decimals={2} suffix=" kg" />
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5">
          <p className="text-xs font-semibold text-slate-500">Recycler Gate Received</p>
          <p className="mt-2 text-2xl font-extrabold text-sky-700 dark:text-sky-400">
            <AnimatedCounter value={totalReceived} decimals={2} suffix=" kg" />
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-700 text-white p-5">
          <p className="text-xs font-semibold text-emerald-200">Documented Recycled Mass</p>
          <p className="mt-2 text-2xl font-extrabold">
            <AnimatedCounter value={totalDocumented} decimals={2} suffix=" kg" />
          </p>
        </div>
      </div>

      {activeTab === "marketplace" ? (
        <MarketplaceWorkspace isOrganization />
      ) : activeTab === "epr" ? (
        <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 overflow-x-auto space-y-4">
          <h2 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Separated Mass-Balance EPR Traceability Records
          </h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-emerald-900 text-slate-500 uppercase">
                <th className="py-3 pr-3">Record</th>
                <th className="py-3 pr-3">Req Qty</th>
                <th className="py-3 pr-3">Est Wt</th>
                <th className="py-3 pr-3">Actual Collected</th>
                <th className="py-3 pr-3">Recycler Received</th>
                <th className="py-3 pr-3">Processed Qty</th>
                <th className="py-3 pr-3">Documented Recycled</th>
                <th className="py-3 pr-3">Docs</th>
                <th className="py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/50">
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="py-3 pr-3">
                    <span className="font-mono font-bold block">{r.recordCode}</span>
                    <span className="text-[11px] text-slate-500">
                      {r.reportingPeriod} • {r.category}
                    </span>
                  </td>
                  <td className="py-3 pr-3">{r.requestedQty}</td>
                  <td className="py-3 pr-3 text-slate-500">~{r.estimatedWeightKg} kg</td>
                  <td className="py-3 pr-3 font-semibold">{r.actualCollectedWeightKg} kg</td>
                  <td className="py-3 pr-3 font-semibold">{r.recyclerReceivedWeightKg} kg</td>
                  <td className="py-3 pr-3">{r.processedQty}</td>
                  <td className="py-3 pr-3 font-bold text-emerald-700 dark:text-emerald-400">
                    {r.documentedRecyclingKg} kg
                  </td>
                  <td className="py-3 pr-3">{r.supportingDocsCount}</td>
                  <td className="py-3 font-mono text-[11px]">{r.verificationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 space-y-3">
          <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
            Organizational Bulk Pickups ({pickups.length})
          </h2>
          {pickups.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-slate-200 dark:border-emerald-900 p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div>
                <span className="font-mono font-bold text-emerald-900 dark:text-emerald-300">
                  {p.requestCode}
                </span>{" "}
                • {p.city}, {p.state}
                <p className="text-slate-500 mt-0.5">
                  {p.requestedTotalQty} units • Est: ~{p.estimatedWeightKg} kg • Actual:{" "}
                  <strong>{p.actualCollectedWeightKg ?? "Pending"} kg</strong>
                </p>
              </div>
              <PickupStatusBadge status={p.status} />
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
