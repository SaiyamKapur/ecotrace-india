"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Truck,
  Scale,
  CalendarClock,
  CheckCircle2,
  MapPin,
  X,
  AlertTriangle,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { useApp } from "@/components/providers";
import {
  AnimatedCounter,
  PickupStatusBadge,
  SkeletonCard,
} from "@/components/ui-primitives";
import type { PickupItemRecord, PickupStatus } from "@/db/schema";

interface PartnerPickup {
  id: number;
  requestCode: string;
  status: PickupStatus;
  items: PickupItemRecord[];
  requestedTotalQty: number;
  estimatedWeightKg: number;
  actualCollectedQty: number | null;
  actualCollectedWeightKg: number | null;
  pickupAddress: string;
  city: string;
  state: string;
  pincode: string | null;
  preferredDate: string;
  preferredTimeSlot: string;
  citizenNotes: string | null;
  partnerNotes: string | null;
  discrepancyFlag: boolean;
  citizen: { fullName: string; phone: string | null } | null;
  collectionCenter: { name: string; code: string } | null;
}

export default function PartnerDashboardPage() {
  const { user, toast, fireConfetti } = useApp();
  const [activeTab, setActiveTab] = useState("assigned");
  const [pickups, setPickups] = useState<PartnerPickup[]>([]);
  const [loading, setLoading] = useState(true);

  const [collectModal, setCollectModal] = useState<PartnerPickup | null>(null);
  const [actualQty, setActualQty] = useState("");
  const [actualWt, setActualWt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadPickups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pickups", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setPickups(d.requests || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      void loadPickups();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user, loadPickups]);

  const handleConfirmSchedule = async (p: PartnerPickup) => {
    const res = await fetch(`/api/pickups/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "schedule" }),
    });
    if (res.ok) {
      toast({ title: `Scheduled: ${p.requestCode}`, variant: "success" });
      await loadPickups();
    } else {
      const d = await res.json();
      toast({ title: "Error", description: d.error, variant: "error" });
    }
  };

  const openCollectModal = (p: PartnerPickup) => {
    setCollectModal(p);
    setActualQty(String(p.requestedTotalQty));
    setActualWt(String(p.estimatedWeightKg));
    setNotes("");
  };

  const handleRecordCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectModal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pickups/${collectModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_collection",
          actualCollectedQty: Number(actualQty),
          actualCollectedWeightKg: Number(actualWt),
          partnerNotes: notes || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast({ title: "Recording failed", description: d.error, variant: "error" });
        return;
      }
      fireConfetti();
      toast({
        title: `Physical Weight Saved: ${actualWt} kg`,
        description: d.request.discrepancyFlag
          ? "Discrepancy flagged for admin verification."
          : "Handover ready for Collection Center verification.",
        variant: d.request.discrepancyFlag ? "warning" : "success",
      });
      setCollectModal(null);
      await loadPickups();
    } finally {
      setSubmitting(false);
    }
  };

  const pendingPickups = pickups.filter((p) => ["assigned", "scheduled"].includes(p.status));
  const collectedPickups = pickups.filter((p) => !["assigned", "scheduled"].includes(p.status));
  const totalMeasuredKg = pickups.reduce((s, p) => s + (p.actualCollectedWeightKg ?? 0), 0);

  const visible = activeTab === "completed" ? collectedPickups : pendingPickups;

  return (
    <DashboardShell
      title="Collection Partner Portal"
      subtitle="Manage assigned pickups, confirm arrival windows & record physical scale weights"
      allowedRoles={["partner", "admin"]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={[
        { id: "assigned", label: "Active Route Pickups", icon: Truck, badge: pendingPickups.length },
        { id: "completed", label: "Collected History", icon: CheckCircle2 },
      ]}
    >
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5">
            <p className="text-xs font-semibold text-slate-500">Pending Route Pickups</p>
            <p className="mt-2 text-2xl font-extrabold text-amber-600">
              <AnimatedCounter value={pendingPickups.length} />
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5">
            <p className="text-xs font-semibold text-slate-500">Completed Handovers</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">
              <AnimatedCounter value={collectedPickups.length} />
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-700 text-white p-5">
            <p className="text-xs font-semibold text-emerald-200">Total Physical Wt. Collected</p>
            <p className="mt-2 text-2xl font-extrabold">
              <AnimatedCounter value={totalMeasuredKg} decimals={2} suffix=" kg" />
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {visible.length === 0 && !loading ? (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-emerald-800 bg-white dark:bg-[#0d1f19] p-10 text-center text-sm text-slate-500">
            No pickups in this tab right now.
          </div>
        ) : (
          visible.map((p) => (
            <div
              key={p.id}
              className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-extrabold text-emerald-900 dark:text-emerald-300">
                      {p.requestCode}
                    </span>
                    <PickupStatusBadge status={p.status} />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {p.citizen?.fullName} {p.citizen?.phone ? `• ${p.citizen.phone}` : ""}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    {p.pickupAddress}, {p.city}, {p.state} {p.pincode}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                    Slot: <strong>{p.preferredDate}</strong> ({p.preferredTimeSlot}) • Hub:{" "}
                    <strong>{p.collectionCenter?.name ?? "Assigned Hub"}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {p.status === "assigned" && (
                    <button
                      type="button"
                      onClick={() => handleConfirmSchedule(p)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                    >
                      Confirm Schedule
                    </button>
                  )}
                  {["assigned", "scheduled"].includes(p.status) && (
                    <button
                      type="button"
                      onClick={() => openCollectModal(p)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold"
                    >
                      <Scale className="w-4 h-4" />
                      Record Physical Collection & Weight
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {(p.items || []).map((it, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                  >
                    {it.category} ×{it.quantity} (~{it.estimatedTotalWeightKg} kg est.)
                  </span>
                ))}
              </div>

              {p.actualCollectedWeightKg != null && (
                <div className="rounded-xl bg-emerald-50/70 dark:bg-[#091813] p-3 text-xs flex flex-wrap justify-between gap-2">
                  <span>
                    Measured Physical Weight:{" "}
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      {p.actualCollectedWeightKg} kg
                    </strong>{" "}
                    ({p.actualCollectedQty} items)
                  </span>
                  <span className="text-slate-500">
                    Initial Estimate: ~{p.estimatedWeightKg} kg
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Record Collection */}
      {collectModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordCollection}
            className="max-w-md w-full rounded-3xl bg-white dark:bg-[#0d1f19] border border-emerald-900/15 dark:border-emerald-400/20 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                Record Physical Collection — {collectModal.requestCode}
              </h3>
              <button type="button" onClick={() => setCollectModal(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Weigh items on a calibrated scale. Recording collection marks items as{" "}
                <strong>Collected</strong> (not yet recycled).
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">
                  Actual Collected Qty (Req: {collectModal.requestedTotalQty})
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={actualQty}
                  onChange={(e) => setActualQty(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">
                  Measured Weight (kg) (Est: ~{collectModal.estimatedWeightKg})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0.05}
                  required
                  value={actualWt}
                  onChange={(e) => setActualWt(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-sm font-bold"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Collection Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Scale ticket or item condition observations..."
                className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCollectModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold"
              >
                {submitting ? "Saving..." : "Confirm Collected Weight"}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}
