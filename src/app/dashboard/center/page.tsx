"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  MapPin,
  CheckCircle2,
  Boxes,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { useApp } from "@/components/providers";
import {
  AnimatedCounter,
  BatchStatusBadge,
  PickupStatusBadge,
} from "@/components/ui-primitives";
import type { BatchStatus, PickupStatus } from "@/db/schema";

interface HubRecord {
  id: number;
  code: string;
  name: string;
  city: string;
  state: string;
  operatingHours: string;
  verificationLabel: string;
  capacityKg: number;
  currentLoadKg: number;
}

interface HubPickup {
  id: number;
  requestCode: string;
  status: PickupStatus;
  city: string;
  state: string;
  actualCollectedQty: number | null;
  actualCollectedWeightKg: number | null;
  estimatedWeightKg: number;
  collectionCenter: { id: number; code: string; name: string } | null;
}

interface HubBatch {
  id: number;
  batchCode: string;
  status: BatchStatus;
  dispatchedQty: number;
  dispatchedWeightKg: number;
  receivedWeightKg: number | null;
}

export default function CenterManagerDashboardPage() {
  const { user, toast, fireConfetti } = useApp();
  const [activeTab, setActiveTab] = useState("verify");
  const [centers, setCenters] = useState<HubRecord[]>([]);
  const [pickups, setPickups] = useState<HubPickup[]>([]);
  const [batches, setBatches] = useState<HubBatch[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const loadData = useCallback(async () => {
    const [cRes, pRes, bRes] = await Promise.all([
      fetch("/api/centers", { cache: "no-store" }),
      fetch("/api/pickups", { cache: "no-store" }),
      fetch("/api/batches", { cache: "no-store" }),
    ]);
    if (cRes.ok) setCenters((await cRes.json()).centers || []);
    if (pRes.ok) setPickups((await pRes.json()).requests || []);
    if (bRes.ok) setBatches((await bRes.json()).batches || []);
  }, []);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user, loadData]);

  const handleVerify = async (id: number) => {
    const res = await fetch(`/api/pickups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify_collection" }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast({ title: "Verification failed", description: d.error, variant: "error" });
      return;
    }
    toast({ title: "Collection Verified at Hub", variant: "success" });
    await loadData();
  };

  const handleDispatchBatch = async () => {
    if (selectedIds.length === 0) return;
    const res = await fetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestIds: selectedIds }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast({ title: "Dispatch failed", description: d.error, variant: "error" });
      return;
    }
    fireConfetti();
    toast({
      title: `Batch ${d.batch.batchCode} Dispatched to Recycler`,
      variant: "success",
    });
    setSelectedIds([]);
    await loadData();
  };

  const punjabHub = centers.find((c) => c.code === "PB-LDH-DEMO-01") ?? centers[0];
  const awaitingVerification = pickups.filter((p) => p.status === "collected");
  const readyForBatch = pickups.filter((p) => p.status === "verified");

  return (
    <DashboardShell
      title="Collection Center Manager Portal"
      subtitle="Verify collection weights across Punjab points and dispatch traceable recycling batches"
      allowedRoles={["center_manager", "admin"]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={[
        {
          id: "verify",
          label: "Verify Incoming Pickups",
          icon: CheckCircle2,
          badge: awaitingVerification.length,
        },
        {
          id: "batching",
          label: "Batch Dispatch",
          icon: Boxes,
          badge: readyForBatch.length,
        },
        { id: "hubs", label: "Punjab & Regional Hubs", icon: MapPin },
      ]}
    >
      {/* Punjab Demonstration Hub Highlight Card */}
      {punjabHub && (
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-[#052e22] via-[#064e3b] to-emerald-800 text-white p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-400/20 text-emerald-200">
                {punjabHub.code}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-400/25 text-amber-200 font-semibold">
                <ShieldAlert className="w-3 h-3" />
                {punjabHub.verificationLabel}
              </span>
            </div>
            <h2 className="text-lg font-extrabold">{punjabHub.name}</h2>
            <p className="text-xs text-emerald-100/80">
              {punjabHub.city}, {punjabHub.state} • {punjabHub.operatingHours}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/15 px-5 py-3 text-right shrink-0">
            <p className="text-[11px] text-emerald-200">Hub Current Load</p>
            <p className="text-2xl font-extrabold">
              <AnimatedCounter value={punjabHub.currentLoadKg} decimals={1} suffix=" kg" />
            </p>
            <p className="text-[11px] text-emerald-200/80">of {punjabHub.capacityKg} kg capacity</p>
          </div>
        </div>
      )}

      {activeTab === "verify" && (
        <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 space-y-4">
          <h3 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-600" />
            Collected Pickups Awaiting Hub Verification ({awaitingVerification.length})
          </h3>
          {awaitingVerification.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              All collected pickups have been verified.
            </p>
          ) : (
            <div className="space-y-3">
              {awaitingVerification.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200 dark:border-emerald-900 p-4 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-emerald-900 dark:text-emerald-300">
                      {p.requestCode}
                    </span>{" "}
                    <PickupStatusBadge status={p.status} />
                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      {p.city}, {p.state} • Measured:{" "}
                      <strong>{p.actualCollectedWeightKg ?? 0} kg</strong> (
                      {p.actualCollectedQty} items) vs Est. ~{p.estimatedWeightKg} kg
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleVerify(p.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold"
                  >
                    Verify Physical Weight
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "batching" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                  Verified Collections Ready for Outbound Batch ({readyForBatch.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Select verified items to assemble a traceable batch for the Recycler.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDispatchBatch}
                disabled={selectedIds.length === 0}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold"
              >
                Dispatch Batch ({selectedIds.length} selected)
              </button>
            </div>

            {readyForBatch.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No unbatched verified collections right now.
              </p>
            ) : (
              <div className="space-y-2">
                {readyForBatch.map((p) => {
                  const checked = selectedIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="cursor-pointer rounded-2xl border border-emerald-900/10 dark:border-emerald-800 p-4 flex items-center justify-between gap-3 text-xs hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? [...prev, p.id]
                                : prev.filter((i) => i !== p.id)
                            )
                          }
                          className="h-4 w-4 accent-emerald-600"
                        />
                        <div>
                          <span className="font-mono font-bold">{p.requestCode}</span> •{" "}
                          {p.city}, {p.state}
                          <p className="text-slate-500">
                            Verified: <strong>{p.actualCollectedWeightKg} kg</strong> (
                            {p.actualCollectedQty} items)
                          </p>
                        </div>
                      </div>
                      <PickupStatusBadge status={p.status} />
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
              Outbound Recycling Batches ({batches.length})
            </h3>
            {batches.map((b) => (
              <div
                key={b.id}
                className="rounded-xl bg-slate-50 dark:bg-[#091813] p-3.5 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    {b.batchCode}
                  </span>
                  <span className="ml-2 text-slate-500">
                    {b.dispatchedWeightKg} kg dispatched ({b.dispatchedQty} items)
                  </span>
                </div>
                <BatchStatusBadge status={b.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "hubs" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {centers.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5 space-y-2 text-xs"
            >
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {c.code}
              </span>
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">{c.name}</h3>
              <p className="text-slate-500">
                {c.city}, {c.state} • {c.operatingHours}
              </p>
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                {c.verificationLabel}
              </p>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
