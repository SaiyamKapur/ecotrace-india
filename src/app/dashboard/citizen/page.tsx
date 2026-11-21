"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Bell,
  User,
  PackageCheck,
  Scale,
  Recycle,
  Clock,
  Award,
  Plus,
  Trash2,
  Eye,
  X,
  CheckCircle2,
  MapPin,
  AlertTriangle,
  ShoppingBag,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { MarketplaceWorkspace } from "@/components/marketplace-workspace";
import { DashboardShell } from "@/components/dashboard-shell";
import { useApp } from "@/components/providers";
import {
  AnimatedCounter,
  PickupStatusBadge,
  ProgressRing,
  SkeletonCard,
} from "@/components/ui-primitives";
import {
  AiEwasteClassifier,
  type ClassificationHandoff,
  type EditableDetectedItem,
} from "@/components/ai-ewaste-classifier";
import {
  EWASTE_CATEGORIES,
  TIME_SLOTS,
  getEstimatedUnitWeight,
} from "@/lib/constants";
import type { PickupItemRecord, PickupStatus } from "@/db/schema";

interface PickupRow {
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
  discrepancyReason: string | null;
  createdAt: string;
  collectedAt: string | null;
  verifiedAt: string | null;
  collectionCenter: { id: number; name: string; code: string; city: string; state: string } | null;
  batch: { id: number; batchCode: string; status: string; documentedRecyclingKg: number | null } | null;
  assignedPartner: { id: number; fullName: string; phone: string | null } | null;
}

interface TimelineEvent {
  id: number;
  stage: string;
  title: string;
  description: string;
  actorName: string | null;
  actorRole: string | null;
  location: string | null;
  createdAt: string;
}

interface CenterOption {
  id: number;
  code: string;
  name: string;
  city: string;
  state: string;
}

interface NotificationRow {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

function CitizenDashboardContent() {
  const searchParams = useSearchParams();
  const { user, refreshAuth, toast, fireConfetti } = useApp();

  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "schedule" || tabParam === "marketplace" ? tabParam : "overview";
  const preselectedCenterId = searchParams.get("centerId");

  const [activeTab, setActiveTab] = useState(initialTab);
  const [linkedListingId, setLinkedListingId] = useState<number | null>(null);
  const [requests, setRequests] = useState<PickupRow[]>([]);
  const [centers, setCenters] = useState<CenterOption[]>([]);
  const [notifs, setNotifs] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected request timeline modal
  const [selectedReq, setSelectedReq] = useState<PickupRow | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Schedule Pickup Form State
  const [formItems, setFormItems] = useState<EditableDetectedItem[]>([
    {
      id: "init-1",
      category: "Mobile Phones",
      quantity: 1,
      userCorrected: false,
    },
  ]);
  const [aiMode, setAiMode] = useState<"live_vision_api" | "demo_mode" | "manual">("manual");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [aiSummaryText, setAiSummaryText] = useState<string>("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [city, setCity] = useState("Ludhiana");
  const [stateName, setStateName] = useState("Punjab");
  const [pincode, setPincode] = useState("141001");
  const [preferredDate, setPreferredDate] = useState(() =>
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [preferredTimeSlot, setPreferredTimeSlot] = useState(TIME_SLOTS[0]);
  const [collectionCenterId, setCollectionCenterId] = useState<string>(
    preselectedCenterId || ""
  );
  const [citizenNotes, setCitizenNotes] = useState("");
  const [submittingPickup, setSubmittingPickup] = useState(false);

  // Profile form state
  const [profName, setProfName] = useState("");
  const [profPhone, setProfPhone] = useState("");
  const [profCity, setProfCity] = useState("");
  const [profState, setProfState] = useState("");
  const [profAddress, setProfAddress] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, ctrRes, notifRes] = await Promise.all([
        fetch("/api/pickups", { cache: "no-store" }),
        fetch("/api/centers", { cache: "no-store" }),
        fetch("/api/notifications", { cache: "no-store" }),
      ]);
      if (reqRes.ok) {
        const d = await reqRes.json();
        setRequests(d.requests || []);
      }
      if (ctrRes.ok) {
        const d = await ctrRes.json();
        const list: CenterOption[] = d.centers || [];
        setCenters(list);
        if (list.length > 0) {
          setCollectionCenterId((current) => current || String(list[0].id));
        }
      }
      if (notifRes.ok) {
        const d = await notifRes.json();
        setNotifs(d.notifications || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      void loadAll();
      setPickupAddress(user.address || "Sarabha Nagar Demo Block, Ludhiana");
      setCity(user.city || "Ludhiana");
      setStateName(user.state || "Punjab");
      setProfName(user.fullName);
      setProfPhone(user.phone || "");
      setProfCity(user.city || "");
      setProfState(user.state || "");
      setProfAddress(user.address || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user, loadAll]);

  // Hydrate pending AI items handed off from homepage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("ecotrace_pending_ai_items");
    if (!raw) return;
    const timer = window.setTimeout(() => {
      try {
        const parsed = JSON.parse(raw) as ClassificationHandoff;
        if (parsed.items && parsed.items.length > 0) {
          setFormItems(parsed.items);
          setAiMode(parsed.mode);
          setUploadedImage(parsed.imageDataUrl);
          setAiSummaryText(parsed.summary);
          const pendingListing = window.sessionStorage.getItem("ecotrace_pending_listing_id");
          if (pendingListing && Number.isInteger(Number(pendingListing))) setLinkedListingId(Number(pendingListing));
          setActiveTab("schedule");
          toast({
            title: "AI-Identified Items Loaded",
            description: "Confirm your pickup address and slot to submit.",
            variant: "info",
          });
        }
      } catch {
        // ignore invalid storage
      } finally {
        window.sessionStorage.removeItem("ecotrace_pending_ai_items");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleApplyAi = (handoff: ClassificationHandoff) => {
    setFormItems(handoff.items);
    setAiMode(handoff.mode);
    setUploadedImage(handoff.imageDataUrl);
    setAiSummaryText(handoff.summary);
  };

  const openTimeline = async (req: PickupRow) => {
    setSelectedReq(req);
    setLoadingTimeline(true);
    try {
      const res = await fetch(`/api/pickups/${req.id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTimeline(data.timeline || []);
      }
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleCancelRequest = async (reqId: number) => {
    const res = await fetch(`/api/pickups/${reqId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: "Cannot cancel", description: data.error, variant: "error" });
      return;
    }
    toast({ title: "Pickup Request Cancelled", variant: "info" });
    loadAll();
  };

  const handleSubmitPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formItems.length === 0) {
      toast({ title: "Add at least one device item", variant: "warning" });
      return;
    }
    setSubmittingPickup(true);
    try {
      const res = await fetch("/api/pickups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: formItems.map((it) => ({
            category: it.category,
            quantity: it.quantity,
            aiPredictedCategory: it.aiPredictedCategory,
            aiConfidence: it.confidence ?? null,
            userCorrected: it.userCorrected,
            notes: it.notes,
          })),
          pickupAddress,
          city,
          state: stateName,
          pincode,
          preferredDate,
          preferredTimeSlot,
          collectionCenterId: collectionCenterId ? Number(collectionCenterId) : null,
          citizenNotes,
          imageDataUrl: uploadedImage,
          aiClassificationMode: aiMode,
          aiRawSummary: aiSummaryText ? { summary: aiSummaryText } : null,
          ...(linkedListingId ? { listingId: linkedListingId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Submission failed", description: data.error, variant: "error" });
        return;
      }

      fireConfetti();
      toast({
        title: `Pickup Submitted: ${data.request.requestCode}`,
        description: "Your request has been saved to PostgreSQL and is ready for review.",
        variant: "success",
      });
      setCitizenNotes("");
      setUploadedImage(null);
      setLinkedListingId(null);
      window.sessionStorage.removeItem("ecotrace_pending_listing_id");
      setActiveTab("overview");
      await loadAll();
      await refreshAuth();
    } finally {
      setSubmittingPickup(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profName,
          phone: profPhone,
          city: profCity,
          state: profState,
          address: profAddress,
        }),
      });
      if (res.ok) {
        await refreshAuth();
        toast({ title: "Profile Updated", variant: "success" });
      } else {
        toast({ title: "Profile update failed", variant: "error" });
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await refreshAuth();
  };

  // Metrics computed from real DB requests
  const activeRequestsCount = requests.filter((r) =>
    ["submitted", "reviewed", "assigned", "scheduled"].includes(r.status)
  ).length;
  const completedPickupsCount = requests.filter((r) =>
    ["collected", "verified", "batched", "received_by_recycler", "processing", "documented"].includes(
      r.status
    )
  ).length;
  const verifiedWeightKg = requests.reduce(
    (sum, r) => sum + (r.actualCollectedWeightKg ?? 0),
    0
  );
  const recyclingRecordsCount = requests.filter((r) => r.status === "documented").length;
  const unreadCount = notifs.filter((n) => !n.isRead).length;

  const formEstWeight = Number(
    formItems
      .reduce((s, i) => s + getEstimatedUnitWeight(i.category) * i.quantity, 0)
      .toFixed(2)
  );
  const formTotalQty = formItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <DashboardShell
      title="Citizen E-Waste Dashboard"
      subtitle="Upload electronics photos, schedule pickups, track actual collected weights & recycling documentation"
      allowedRoles={["citizen", "organization", "admin"]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={[
        { id: "overview", label: "Overview & My Pickups", icon: LayoutDashboard },
        { id: "marketplace", label: "My Products & Wallet", icon: ShoppingBag },
        { id: "schedule", label: "AI Scan & Schedule Pickup", icon: Sparkles },
        { id: "notifications", label: "Notifications", icon: Bell, badge: unreadCount },
        { id: "profile", label: "Profile Settings", icon: User },
      ]}
      headerActions={
        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Pickup</span>
        </button>
      }
    >
      {/* TAB 1: OVERVIEW & HISTORY */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#052e22] via-[#07583e] to-[#0c805a] p-6 sm:p-8 text-white shadow-[0_24px_65px_rgba(3,70,46,.18)] animate-rise-in">
            <div className="pointer-events-none absolute -top-30 right-0 h-75 w-75 rounded-full border-[38px] border-emerald-300/15 premium-orbit" />
            <div className="pointer-events-none absolute -bottom-30 right-32 h-75 w-75 rounded-full bg-lime-300/15 blur-3xl" />
            <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6"><div className="max-w-xl"><span className="premium-kicker text-emerald-200">YOUR PERSONAL CIRCULAR DASHBOARD</span><h2 className="mt-3 text-3xl sm:text-4xl font-extrabold premium-heading">Good to have you here, <span className="text-lime-300">{user?.fullName.split(" ")[0] || "friend"}.</span></h2><p className="mt-3 text-sm text-emerald-100/80 leading-relaxed">Every old device can start a better story. List your products, review your demo offer, book collection, and follow the complete journey to a simulated wallet credit.</p><div className="mt-5 flex flex-wrap gap-2.5"><button type="button" onClick={() => setActiveTab("marketplace")} className="premium-button inline-flex items-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 text-xs font-extrabold text-[#073b28]"><ShoppingBag className="h-4 w-4" />My products & wallet <ArrowRight className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setActiveTab("schedule")} className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md hover:bg-white/20">Schedule a pickup</button></div></div><div className="flex max-w-xs items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-lg"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lime-300/20 text-lime-200"><Wallet className="h-5 w-5" /></div><div><p className="text-xs font-bold text-emerald-200">A transparent path to value</p><p className="text-[11px] leading-relaxed text-emerald-100/80">Photo → reviewed offer → verified collection → documented recycling → demo wallet.</p></div></div></div>
          </div>
          {/* Metrics Row */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Active Requests</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">
                  <AnimatedCounter value={activeRequestsCount} />
                </p>
                <p className="mt-1 text-[11px] text-slate-500">Awaiting pickup completion</p>
              </div>

              <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Completed Pickups</span>
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">
                  <AnimatedCounter value={completedPickupsCount} />
                </p>
                <p className="mt-1 text-[11px] text-slate-500">Collected & weighed on scale</p>
              </div>

              <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Verified Collected Wt.</span>
                  <Scale className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                  <AnimatedCounter value={verifiedWeightKg} decimals={2} suffix=" kg" />
                </p>
                <p className="mt-1 text-[11px] text-slate-500">Actual measured weight</p>
              </div>

              <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Recycling Records</span>
                  <Recycle className="w-4 h-4 text-sky-600" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">
                  <AnimatedCounter value={recyclingRecordsCount} />
                </p>
                <p className="mt-1 text-[11px] text-slate-500">Documented end-to-end</p>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-700 text-white p-5 shadow-md flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200">
                    <Award className="w-4 h-4" />
                    <span>Green Points</span>
                  </div>
                  <p className="mt-1.5 text-2xl font-extrabold tabular-nums">
                    <AnimatedCounter value={user?.greenPoints ?? 0} />
                  </p>
                  <p className="text-[10px] text-emerald-200/80">Earned on verified pickups</p>
                </div>
                <ProgressRing
                  percent={Math.min(100, ((user?.greenPoints ?? 0) % 500) / 5)}
                  size={52}
                  color="#a7f3d0"
                  label="Tier"
                />
              </div>
            </div>
          )}

          {/* Pickup Requests Table */}
          <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
                  My E-Waste Collection Requests & Recycling Progress
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click <strong>Track Timeline</strong> to inspect every timestamped handover from
                  submission to recycling documentation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("schedule")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Scan & Add E-Waste
              </button>
            </div>

            {requests.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-emerald-800 p-10 text-center space-y-3">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  No pickup requests yet
                </p>
                <p className="text-xs text-slate-500">
                  Upload a photo of your old electronics to schedule your first traceable pickup.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("schedule")}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold"
                >
                  Schedule First Pickup
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-emerald-900 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 pr-4">Request ID</th>
                      <th className="py-3 pr-4">Devices</th>
                      <th className="py-3 pr-4">Est. Weight</th>
                      <th className="py-3 pr-4">Actual Collected Wt.</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Batch / Recycling</th>
                      <th className="py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/50">
                    {requests.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30"
                      >
                        <td className="py-3.5 pr-4">
                          <span className="font-mono font-bold text-emerald-900 dark:text-emerald-300 block">
                            {r.requestCode}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {r.city}, {r.state} • {r.preferredDate}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(r.items || []).map((it, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-emerald-950 text-slate-700 dark:text-emerald-200 text-[11px]"
                              >
                                {it.category} ×{it.quantity}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 tabular-nums text-slate-600 dark:text-slate-300">
                          ~{r.estimatedWeightKg.toFixed(2)} kg
                          <span className="block text-[10px] text-slate-400">estimate</span>
                        </td>
                        <td className="py-3.5 pr-4 tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                          {r.actualCollectedWeightKg != null
                            ? `${r.actualCollectedWeightKg.toFixed(2)} kg`
                            : "Pending scale"}
                          {r.discrepancyFlag && (
                            <span className="block text-[10px] text-rose-600 font-semibold">
                              ⚠ Variance flagged
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pr-4">
                          <PickupStatusBadge status={r.status} />
                        </td>
                        <td className="py-3.5 pr-4">
                          {r.batch ? (
                            <div>
                              <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                {r.batch.batchCode}
                              </span>
                              <span className="block text-[10px] text-slate-500">
                                {r.batch.documentedRecyclingKg != null
                                  ? `${r.batch.documentedRecyclingKg} kg documented`
                                  : `Batch: ${r.batch.status}`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">Not batched yet</span>
                          )}
                        </td>
                        <td className="py-3.5 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => openTimeline(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-semibold hover:bg-emerald-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Track Timeline
                          </button>
                          {["submitted", "reviewed", "assigned", "scheduled"].includes(r.status) && (
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(r.id)}
                              className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUSTOMER PRODUCT LISTINGS, OFFER REVIEW & DEMO WALLET */}
      {activeTab === "marketplace" && <MarketplaceWorkspace />}

      {/* TAB 2: AI SCAN & SCHEDULE PICKUP */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white mb-1">
              Step 1: AI-Assisted E-Waste Photo Identification (Optional)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Upload an image of single or multiple devices, correct categories or counts, and click{" "}
              <strong>Add to Pickup Request</strong> to populate the pickup form below.
            </p>
            <AiEwasteClassifier compact onApplyToPickup={handleApplyAi} />
          </div>

          <form
            onSubmit={handleSubmitPickup}
            className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 sm:p-8 shadow-sm space-y-6"
          >
            {linkedListingId && <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-4"><ShoppingBag className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" /><div><p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Accepted product offer linked to this pickup</p><p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">Your product listing #{linkedListingId} is attached. Keep its category and quantity in the items below. Demo wallet settlement happens only after documented recycling and admin approval; this form does not transfer money.</p></div></div>}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-emerald-900/60 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
                  Step 2: Confirm Devices, Address & Preferred Pickup Slot
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total: <strong>{formTotalQty} device(s)</strong> • Initial Reference Estimate:{" "}
                  <strong>~{formEstWeight} kg</strong> (actual weight measured at pickup)
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormItems((prev) => [
                    ...prev,
                    {
                      id: `row-${Date.now()}`,
                      category: "Laptops",
                      quantity: 1,
                      userCorrected: true,
                    },
                  ])
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item Row
              </button>
            </div>

            {/* Editable Device Items */}
            <div className="space-y-2.5">
              {formItems.map((it) => (
                <div
                  key={it.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center rounded-2xl bg-emerald-50/40 dark:bg-[#091813] border border-emerald-900/10 dark:border-emerald-500/15 p-3"
                >
                  <div className="sm:col-span-6">
                    <select
                      value={it.category}
                      onChange={(e) =>
                        setFormItems((prev) =>
                          prev.map((row) =>
                            row.id === it.id
                              ? { ...row, category: e.target.value, userCorrected: true }
                              : row
                          )
                        )
                      }
                      className="w-full rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0d1f19] px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white"
                    >
                      {EWASTE_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label} (~{c.estimatedUnitWeightKg} kg/unit ref)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2">
                    <label className="text-xs text-slate-500 shrink-0">Qty:</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={it.quantity}
                      onChange={(e) =>
                        setFormItems((prev) =>
                          prev.map((row) =>
                            row.id === it.id
                              ? { ...row, quantity: Math.max(1, Number(e.target.value) || 1) }
                              : row
                          )
                        )
                      }
                      className="w-full rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0d1f19] px-3 py-2 text-sm font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 tabular-nums">
                    ~{(getEstimatedUnitWeight(it.category) * it.quantity).toFixed(2)} kg est.
                  </div>
                  <div className="sm:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setFormItems((prev) => prev.filter((row) => row.id !== it.id))
                      }
                      className="p-2 text-slate-400 hover:text-rose-600"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Address & Schedule Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pickup Street Address (Private — shared only with assigned partner & ops)
                </label>
                <input
                  type="text"
                  required
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="House/Flat No, Street, Locality"
                  className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    required
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Preferred Collection Date
                </label>
                <input
                  type="date"
                  required
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Preferred Time Slot
                </label>
                <select
                  value={preferredTimeSlot}
                  onChange={(e) => setPreferredTimeSlot(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Destination Demonstration Collection Center
                </label>
                <select
                  value={collectionCenterId}
                  onChange={(e) => setCollectionCenterId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                >
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.code.replace("-DEMO-", "-")}] {c.name} — {c.city}, {c.state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Additional Handling Notes (Optional — e.g., swollen batteries, gate access)
                </label>
                <textarea
                  rows={2}
                  value={citizenNotes}
                  onChange={(e) => setCitizenNotes(e.target.value)}
                  placeholder="Any helpful instructions for the collection partner..."
                  className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-emerald-900/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Actual weight will be confirmed on a calibrated scale during physical pickup.
              </p>
              <button
                type="submit"
                disabled={submittingPickup}
                className="px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-600 hover:from-emerald-700 hover:to-emerald-500 text-white font-bold text-sm shadow-lg disabled:opacity-50"
              >
                {submittingPickup ? "Submitting Request..." : "Submit Traceable Pickup Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS */}
      {activeTab === "notifications" && (
        <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
              Notifications ({unreadCount} unread)
            </h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>
          {notifs.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No notifications yet.</p>
          ) : (
            <div className="space-y-2.5">
              {notifs.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-2xl border p-4 ${
                    n.isRead
                      ? "border-slate-100 dark:border-emerald-900/50 bg-slate-50/50 dark:bg-[#091813]"
                      : "border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{n.title}</h3>
                    <span className="text-[11px] text-slate-500">
                      {new Date(n.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PROFILE MANAGEMENT */}
      {activeTab === "profile" && (
        <form
          onSubmit={handleSaveProfile}
          className="max-w-2xl rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 sm:p-8 shadow-sm space-y-4"
        >
          <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
            Manage Your Citizen Profile
          </h2>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={profName}
              onChange={(e) => setProfName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-4 py-2.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={profPhone}
                onChange={(e) => setProfPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email (Read-only)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full rounded-xl border border-slate-200 dark:border-emerald-900 bg-slate-100 dark:bg-emerald-950/50 px-4 py-2.5 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                City
              </label>
              <input
                type="text"
                value={profCity}
                onChange={(e) => setProfCity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                State
              </label>
              <input
                type="text"
                value={profState}
                onChange={(e) => setProfState(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-4 py-2.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Default Pickup Address
            </label>
            <textarea
              rows={2}
              value={profAddress}
              onChange={(e) => setProfAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-4 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
          >
            {savingProfile ? "Saving..." : "Save Profile Changes"}
          </button>
        </form>
      )}

      {/* Traceability Timeline Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0d1f19] border border-emerald-900/15 dark:border-emerald-400/20 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-emerald-900/60 pb-4">
              <div>
                <span className="font-mono text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                  {selectedReq.requestCode}
                </span>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">
                  Full E-Waste Traceability Journey
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReq(null)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-emerald-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 dark:bg-[#091813] p-3">
                <p className="text-slate-500">Status</p>
                <div className="mt-1">
                  <PickupStatusBadge status={selectedReq.status} />
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-[#091813] p-3">
                <p className="text-slate-500">Initial Estimate</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">
                  ~{selectedReq.estimatedWeightKg.toFixed(2)} kg
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-[#091813] p-3">
                <p className="text-slate-500">Actual Collected</p>
                <p className="mt-1 font-bold text-emerald-700 dark:text-emerald-400">
                  {selectedReq.actualCollectedWeightKg != null
                    ? `${selectedReq.actualCollectedWeightKg.toFixed(2)} kg`
                    : "Pending"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-[#091813] p-3">
                <p className="text-slate-500">Batch</p>
                <p className="mt-1 font-mono font-bold text-slate-900 dark:text-white">
                  {selectedReq.batch?.batchCode ?? "Unassigned"}
                </p>
              </div>
            </div>

            {selectedReq.discrepancyFlag && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{selectedReq.discrepancyReason || "Discrepancy flagged for admin review."}</span>
              </div>
            )}

            {loadingTimeline ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading timeline...</div>
            ) : (
              <ol className="relative border-l-2 border-emerald-200 dark:border-emerald-800 ml-3 space-y-4">
                {timeline.map((ev) => (
                  <li key={ev.id} className="ml-6 relative">
                    <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <CheckCircle2 className="w-3 h-3" />
                    </span>
                    <div className="rounded-2xl bg-slate-50 dark:bg-[#091813] border border-emerald-900/10 dark:border-emerald-500/15 p-3.5">
                      <div className="flex flex-wrap justify-between gap-2 text-xs">
                        <strong className="text-slate-900 dark:text-white">{ev.title}</strong>
                        <span className="text-[11px] text-slate-500">
                          {new Date(ev.createdAt).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {ev.description}
                      </p>
                      {ev.location && (
                        <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {ev.location}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

export default function CitizenDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-slate-500">
          Loading Citizen Dashboard...
        </div>
      }
    >
      <CitizenDashboardContent />
    </Suspense>
  );
}
