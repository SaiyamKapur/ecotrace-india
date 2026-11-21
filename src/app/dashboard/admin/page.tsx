"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Truck,
  Boxes,
  MapPin,
  Users,
  FileSearch,
  Settings,
  AlertTriangle,
  Calendar,
  Download,
  CheckCircle2,
  Plus,
  RefreshCw,
  ShieldCheck,
  FileCheck2,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { AdminMarketplace } from "@/components/admin-marketplace";
import { DashboardShell } from "@/components/dashboard-shell";
import { useApp } from "@/components/providers";
import {
  AnimatedCounter,
  BatchStatusBadge,
  MiniSparkline,
  PickupStatusBadge,
  ProgressRing,
  SkeletonCard,
} from "@/components/ui-primitives";
import {
  CategoryDonutChart,
  CollectionRecyclingTrendChart,
  RegionalBarChart,
  type AnalyticsPayload,
} from "@/components/impact-charts";
import type { BatchStatus, PickupStatus, UserRole } from "@/db/schema";
import { EWASTE_CATEGORIES, ROLE_LABELS } from "@/lib/constants";

interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  city: string | null;
  state: string | null;
  isActive: boolean;
  isDemoAccount: boolean;
}

interface AdminPickup {
  id: number;
  requestCode: string;
  status: PickupStatus;
  requestedTotalQty: number;
  estimatedWeightKg: number;
  actualCollectedQty: number | null;
  actualCollectedWeightKg: number | null;
  city: string;
  state: string;
  preferredDate: string;
  preferredTimeSlot: string;
  discrepancyFlag: boolean;
  discrepancyReason: string | null;
  assignedPartnerId: number | null;
  collectionCenterId: number | null;
  citizen: { fullName: string; email: string } | null;
  assignedPartner: { id: number; fullName: string } | null;
  collectionCenter: { id: number; code: string; name: string } | null;
}

interface AdminBatch {
  id: number;
  batchCode: string;
  status: BatchStatus;
  dispatchedQty: number;
  dispatchedWeightKg: number;
  receivedWeightKg: number | null;
  documentedRecyclingKg: number | null;
  discrepancyFlag: boolean;
  discrepancyNotes: string | null;
  collectionCenter: { name: string; city: string } | null;
}

interface AdminCenter {
  id: number;
  code: string;
  name: string;
  city: string;
  state: string;
  operatingHours: string;
  verificationLabel: string;
  isDemoSample: boolean;
  isActive: boolean;
  capacityKg: number;
  currentLoadKg: number;
}

interface EprRow {
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
}

interface AuditRow {
  id: number;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface SettingRow {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
}

const DATE_PRESETS = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "all", label: "All" },
];

export default function AdminDashboardPage() {
  const { user, toast, fireConfetti } = useApp();
  const [activeTab, setActiveTab] = useState("overview");

  // Unified Date Filter
  const [range, setRange] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Data States
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [pickups, setPickups] = useState<AdminPickup[]>([]);
  const [batches, setBatches] = useState<AdminBatch[]>([]);
  const [centers, setCenters] = useState<AdminCenter[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [eprList, setEprList] = useState<EprRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Operational selection states
  const [selectedForBatch, setSelectedForBatch] = useState<number[]>([]);
  const [auditQuery, setAuditQuery] = useState("");
  const [thresholdPct, setThresholdPct] = useState("10");

  // New Center Form
  const [newCenterOpen, setNewCenterOpen] = useState(false);
  const [cCode, setCCode] = useState("");
  const [cName, setCName] = useState("");
  const [cCity, setCCity] = useState("Amritsar");
  const [cState, setCState] = useState("Punjab");
  const [cAddr, setCAddr] = useState("");
  const [cHours, setCHours] = useState("Mon–Sat: 09:30 AM – 06:00 PM");

  const loadAnalytics = useCallback(async () => {
    const qs = new URLSearchParams({ range });
    if (range === "custom" && customFrom) {
      qs.set("from", customFrom);
      if (customTo) qs.set("to", customTo);
    }
    const res = await fetch(`/api/analytics?${qs.toString()}`, { cache: "no-store" });
    if (res.ok) {
      setAnalytics(await res.json());
    }
  }, [range, customFrom, customTo]);

  const loadOperations = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, bRes, cRes, uRes, eRes, aRes, sRes] = await Promise.all([
        fetch("/api/pickups", { cache: "no-store" }),
        fetch("/api/batches", { cache: "no-store" }),
        fetch("/api/centers?includeInactive=true", { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/epr", { cache: "no-store" }),
        fetch("/api/admin/audit-logs", { cache: "no-store" }),
        fetch("/api/admin/settings", { cache: "no-store" }),
      ]);
      if (pRes.ok) setPickups((await pRes.json()).requests || []);
      if (bRes.ok) setBatches((await bRes.json()).batches || []);
      if (cRes.ok) setCenters((await cRes.json()).centers || []);
      if (uRes.ok) setAllUsers((await uRes.json()).users || []);
      if (eRes.ok) setEprList((await eRes.json()).records || []);
      if (aRes.ok) setAuditLogs((await aRes.json()).logs || []);
      if (sRes.ok) {
        const list: SettingRow[] = (await sRes.json()).settings || [];
        setSettings(list);
        const disc = list.find((s) => s.key === "discrepancy_thresholds");
        if (disc && typeof disc.value?.weightVariancePercentThreshold === "number") {
          setThresholdPct(String(disc.value.weightVariancePercentThreshold));
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") return;
    const timer = window.setTimeout(() => {
      void loadAnalytics();
      void loadOperations();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user, loadAnalytics, loadOperations]);

  const partners = allUsers.filter((u) => u.role === "partner" && u.isActive);
  const recyclers = allUsers.filter((u) => u.role === "recycler" && u.isActive);

  const handleAssignPartner = async (reqId: number, partnerId: number, centerId?: number | null) => {
    const res = await fetch(`/api/pickups/${reqId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign",
        assignedPartnerId: partnerId,
        ...(centerId ? { collectionCenterId: centerId } : {}),
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast({ title: "Assignment failed", description: d.error, variant: "error" });
      return;
    }
    toast({ title: "Partner Assigned", variant: "success" });
    await Promise.all([loadOperations(), loadAnalytics()]);
  };

  const handlePickupAction = async (
    reqId: number,
    action: "schedule" | "verify_collection" | "resolve_discrepancy"
  ) => {
    const res = await fetch(`/api/pickups/${reqId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast({ title: "Action failed", description: d.error, variant: "error" });
      return;
    }
    toast({ title: `Updated: ${action.replace("_", " ")}`, variant: "success" });
    await Promise.all([loadOperations(), loadAnalytics()]);
  };

  const handleCreateBatch = async () => {
    if (selectedForBatch.length === 0) {
      toast({ title: "Select verified pickups first", variant: "warning" });
      return;
    }
    const res = await fetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestIds: selectedForBatch,
        recyclerId: recyclers[0]?.id ?? null,
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast({ title: "Batch creation failed", description: d.error, variant: "error" });
      return;
    }
    fireConfetti();
    toast({
      title: `Batch Dispatched: ${d.batch.batchCode}`,
      description: `${selectedForBatch.length} verified request(s) sent to recycler.`,
      variant: "success",
    });
    setSelectedForBatch([]);
    await Promise.all([loadOperations(), loadAnalytics()]);
  };

  const handleResolveBatchDiscrepancy = async (batchId: number) => {
    const res = await fetch(`/api/batches/${batchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "resolve_discrepancy",
        discrepancyNotes: "Investigated & cleared by platform administrator.",
      }),
    });
    if (res.ok) {
      toast({ title: "Batch Discrepancy Cleared", variant: "success" });
      await Promise.all([loadOperations(), loadAnalytics()]);
    }
  };

  const handleUpdateUser = async (targetId: number, patch: { role?: UserRole; isActive?: boolean }) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: targetId, ...patch }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast({ title: "Update failed", description: d.error, variant: "error" });
      return;
    }
    toast({ title: "User updated", variant: "success" });
    await loadOperations();
  };

  const handleToggleCenter = async (center: AdminCenter) => {
    const res = await fetch(`/api/centers/${center.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !center.isActive }),
    });
    if (res.ok) {
      toast({ title: `${center.code} ${center.isActive ? "deactivated" : "activated"}`, variant: "info" });
      await loadOperations();
    }
  };

  const handleAddCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/centers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: cCode.trim().toUpperCase(),
        name: cName.trim(),
        city: cCity.trim(),
        state: cState.trim(),
        address: cAddr.trim(),
        latitude: 31.634,
        longitude: 74.8723,
        acceptedCategories: EWASTE_CATEGORIES.slice(0, 8).map((c) => c.id),
        operatingHours: cHours,
        verificationLabel: "Demonstration Sample Center — Non-Statutory",
        isDemoSample: true,
        capacityKg: 1500,
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast({ title: "Could not add center", description: d.error, variant: "error" });
      return;
    }
    toast({ title: `Collection Center Created: ${d.center.code}`, variant: "success" });
    setNewCenterOpen(false);
    setCCode("");
    setCName("");
    setCAddr("");
    await loadOperations();
  };

  const handleUpdateEpr = async (id: number, status: "verified_internal" | "discrepancy_flagged") => {
    const res = await fetch("/api/epr", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, verificationStatus: status }),
    });
    if (res.ok) {
      toast({ title: "Internal EPR status updated", variant: "success" });
      await loadOperations();
    }
  };

  const handleSaveThreshold = async () => {
    const val = Math.max(1, Math.min(50, Number(thresholdPct) || 10));
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "discrepancy_thresholds",
        value: {
          weightVariancePercentThreshold: val,
          requireHumanReviewOnQtyMismatch: true,
          autoConvertToStatutoryEprCredit: false,
        },
      }),
    });
    if (res.ok) {
      toast({ title: `Discrepancy threshold updated to ${val}%`, variant: "success" });
      await loadOperations();
    }
  };

  const exportPlatformCsv = () => {
    const headers = [
      "Request Code",
      "Status",
      "City",
      "State",
      "Requested Qty",
      "Est Weight (kg)",
      "Actual Collected Qty",
      "Actual Collected Wt (kg)",
      "Discrepancy",
    ];
    const rows = pickups.map((p) => [
      p.requestCode,
      p.status,
      p.city,
      p.state,
      p.requestedTotalQty,
      p.estimatedWeightKg,
      p.actualCollectedQty ?? "",
      p.actualCollectedWeightKg ?? "",
      p.discrepancyFlag ? "YES" : "NO",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecotrace-admin-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Admin Operations Report Exported", variant: "success" });
  };

  const verifiedUnbatched = pickups.filter((p) => p.status === "verified");
  const pendingCount = pickups.filter((p) =>
    ["submitted", "reviewed", "collected"].includes(p.status)
  ).length;
  const discrepancyCount =
    pickups.filter((p) => p.discrepancyFlag).length +
    batches.filter((b) => b.discrepancyFlag || b.status === "discrepancy_review").length;

  const sparkCollected = (analytics?.trends || []).map((t) => t.actualCollectedWeightKg);
  const sparkRequests = (analytics?.trends || []).map((t) => t.requests);

  return (
    <DashboardShell
      title="Admin Sustainability Command Center"
      subtitle="Unified analytics, pickup operations, batch verification, Punjab & regional hubs, EPR oversight & audit logs"
      allowedRoles={["admin"]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={[
        { id: "overview", label: "Analytics Overview", icon: LayoutDashboard },
        { id: "marketplace", label: "Products & Settlements", icon: ShoppingBag },
        { id: "pickups", label: "Pickup Operations", icon: Truck, badge: pendingCount },
        { id: "batches", label: "Batches & Discrepancies", icon: Boxes, badge: discrepancyCount },
        { id: "centers", label: "Collection Centers", icon: MapPin },
        { id: "users", label: "Users & Roles", icon: Users },
        { id: "audit", label: "Audit Logs", icon: FileSearch },
        { id: "settings", label: "Platform Settings", icon: Settings },
      ]}
      headerActions={
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 rounded-xl bg-emerald-50 dark:bg-[#0d1f19] border border-emerald-200 dark:border-emerald-800 p-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 ml-1.5" />
            {DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setRange(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  range === p.id
                    ? "bg-emerald-700 text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportPlatformCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Report CSV</span>
          </button>
        </div>
      }
    >
      {activeTab === "marketplace" && <AdminMarketplace />}

      {/* TAB 1: ANALYTICS OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#042b20] via-[#07543c] to-[#087a53] p-6 sm:p-8 text-white shadow-[0_24px_65px_rgba(3,66,42,.18)] animate-rise-in"><div className="pointer-events-none absolute -top-26 right-0 h-72 w-72 rounded-full border-[36px] border-emerald-300/15 premium-orbit" /><div className="relative flex flex-wrap items-end justify-between gap-5"><div><span className="premium-kicker text-emerald-200">ECOtrace / OPERATIONS INTELLIGENCE</span><h2 className="mt-2 text-3xl font-extrabold premium-heading">A clearer picture of <span className="text-lime-300">what comes next.</span></h2><p className="mt-2 max-w-xl text-sm text-emerald-100/75">Real collection signals, auditable recycling milestones and a fully reviewable customer product-to-sandbox-settlement pipeline—all in one place.</p></div><button type="button" onClick={() => setActiveTab("marketplace")} className="premium-button flex items-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 text-xs font-extrabold text-[#073b28]"><Wallet className="h-4 w-4" />Review product settlements</button></div></div>
          {/* Date Filter Control Bar (also accessible on mobile + custom range) */}
          <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                Active Filter Window:
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200 font-bold">
                {analytics?.dateRange.label ?? "Loading..."}
              </span>
              <div className="flex md:hidden gap-1">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setRange(p.id)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                      range === p.id ? "bg-emerald-700 text-white" : "bg-slate-100 dark:bg-emerald-950"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  setRange("custom");
                }}
                aria-label="Custom start date"
                className="rounded-lg border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-2.5 py-1 text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  setRange("custom");
                }}
                aria-label="Custom end date"
                className="rounded-lg border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-2.5 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  loadAnalytics();
                  loadOperations();
                }}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                title="Refresh analytics"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Compact SaaS KPI Cards */}
          {!analytics || loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Pickup Requests
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-slate-950 dark:text-white">
                      <AnimatedCounter value={analytics.kpis.totalRequests} />
                    </p>
                    <p className="text-[11px] text-amber-600 font-semibold">
                      {analytics.kpis.pendingApprovalsCount} pending review/verify
                    </p>
                  </div>
                  <MiniSparkline data={sparkRequests} color="#10b981" />
                </div>

                <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Measured Collected
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                      <AnimatedCounter
                        value={analytics.kpis.actualCollectedWeightKg}
                        decimals={1}
                        suffix=" kg"
                      />
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Est: ~{analytics.kpis.estimatedWeightKg.toFixed(1)} kg
                    </p>
                  </div>
                  <MiniSparkline data={sparkCollected} color="#059669" />
                </div>

                <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Documented Recycled
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-sky-700 dark:text-sky-400">
                      <AnimatedCounter
                        value={analytics.kpis.documentedRecyclingKg}
                        decimals={1}
                        suffix=" kg"
                      />
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {analytics.kpis.documentedBatchesCount}/{analytics.kpis.totalBatches} batches
                    </p>
                  </div>
                  <ProgressRing
                    percent={
                      analytics.kpis.actualCollectedWeightKg > 0
                        ? (analytics.kpis.documentedRecyclingKg /
                            analytics.kpis.actualCollectedWeightKg) *
                          100
                        : 0
                    }
                    color="#0284c7"
                  />
                </div>

                <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/60 bg-white dark:bg-[#0d1f19] p-5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Discrepancy Alerts
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-rose-600">
                      <AnimatedCounter value={analytics.kpis.discrepanciesCount} />
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {analytics.kpis.activeCentersCount} active demo centers
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("batches")}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold"
                  >
                    Inspect
                  </button>
                </div>
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6">
                  <h2 className="text-sm font-extrabold text-slate-950 dark:text-white">
                    Collection & Recycling Trends ({analytics.dateRange.label})
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">
                    Distinguishes initial submission estimates from measured physical collection &
                    documented recycling
                  </p>
                  <CollectionRecyclingTrendChart data={analytics.trends} />
                </div>

                <div className="lg:col-span-5 rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6">
                  <h2 className="text-sm font-extrabold text-slate-950 dark:text-white">
                    Category Distribution ({analytics.dateRange.label})
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">
                    Device counts synced to active date filter
                  </p>
                  <CategoryDonutChart data={analytics.categoryDistribution} />
                </div>
              </div>

              {/* Charts Row 2: Regional Analytics + Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6">
                  <h2 className="text-sm font-extrabold text-slate-950 dark:text-white">
                    Regional Collection Analytics ({analytics.dateRange.label})
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">
                    Includes Ludhiana, Punjab pilot hub alongside sample Indian hubs
                  </p>
                  <RegionalBarChart data={analytics.regionalAnalytics} />
                </div>

                <div className="lg:col-span-5 rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 space-y-3">
                  <h2 className="text-sm font-extrabold text-slate-950 dark:text-white">
                    Recent Verified Activity ({analytics.dateRange.label})
                  </h2>
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {analytics.recentActivity.length === 0 ? (
                      <p className="text-xs text-slate-500 py-8 text-center">
                        No activity events in this range.
                      </p>
                    ) : (
                      analytics.recentActivity.map((ev) => (
                        <div
                          key={ev.id}
                          className="rounded-xl bg-slate-50 dark:bg-[#091813] border border-emerald-900/10 dark:border-emerald-500/10 p-3 text-xs"
                        >
                          <div className="flex justify-between gap-2">
                            <strong className="text-slate-900 dark:text-white">{ev.title}</strong>
                            <span className="text-[10px] text-slate-500 shrink-0">
                              {new Date(ev.createdAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {ev.description}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: PICKUP OPERATIONS & BATCH CREATION */}
      {activeTab === "pickups" && (
        <div className="space-y-6">
          {/* Batch Consolidation Bar */}
          {verifiedUnbatched.length > 0 && (
            <div className="rounded-2xl bg-emerald-900 text-white p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
              <div className="text-xs">
                <strong className="text-sm block">
                  {verifiedUnbatched.length} Verified Collection(s) Ready for Recycling Batch
                </strong>
                <span className="text-emerald-200">
                  Select verified rows below ({selectedForBatch.length} selected) to dispatch an
                  outbound batch to the Recycler.
                </span>
              </div>
              <button
                type="button"
                onClick={handleCreateBatch}
                disabled={selectedForBatch.length === 0}
                className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-emerald-950 font-bold text-xs"
              >
                Create & Dispatch Recycling Batch ({selectedForBatch.length})
              </button>
            </div>
          )}

          <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 overflow-x-auto">
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white mb-4">
              All Pickup Requests & Operational Controls ({pickups.length})
            </h2>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-emerald-900 text-slate-500 uppercase tracking-wider">
                  <th className="py-3 pr-2">Batch</th>
                  <th className="py-3 pr-4">Request</th>
                  <th className="py-3 pr-4">Citizen & Location</th>
                  <th className="py-3 pr-4">Est vs Actual Wt</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Partner Assignment</th>
                  <th className="py-3 text-right">Workflow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/50">
                {pickups.map((p) => {
                  const canSelectBatch = p.status === "verified";
                  const checked = selectedForBatch.includes(p.id);
                  return (
                    <tr key={p.id} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30">
                      <td className="py-3 pr-2">
                        {canSelectBatch && (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedForBatch((prev) =>
                                e.target.checked
                                  ? [...prev, p.id]
                                  : prev.filter((id) => id !== p.id)
                              )
                            }
                            aria-label={`Select ${p.requestCode} for batch`}
                            className="h-4 w-4 accent-emerald-600"
                          />
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-mono font-bold text-emerald-900 dark:text-emerald-300 block">
                          {p.requestCode}
                        </span>
                        <span className="text-[11px] text-slate-500">{p.preferredDate}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <strong className="block text-slate-900 dark:text-white">
                          {p.citizen?.fullName ?? "Citizen"}
                        </strong>
                        <span className="text-[11px] text-slate-500">
                          {p.city}, {p.state}
                        </span>
                      </td>
                      <td className="py-3 pr-4 tabular-nums">
                        <span className="text-slate-500 block">~{p.estimatedWeightKg} kg est.</span>
                        <strong className="text-emerald-700 dark:text-emerald-400">
                          {p.actualCollectedWeightKg != null
                            ? `${p.actualCollectedWeightKg} kg actual`
                            : "Not weighed"}
                        </strong>
                        {p.discrepancyFlag && (
                          <span className="block text-[10px] text-rose-600 font-bold">
                            ⚠ {p.discrepancyReason}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <PickupStatusBadge status={p.status} />
                      </td>
                      <td className="py-3 pr-4">
                        {["submitted", "reviewed", "assigned"].includes(p.status) &&
                        partners.length > 0 ? (
                          <select
                            defaultValue={p.assignedPartnerId ?? ""}
                            onChange={(e) => {
                              const pid = Number(e.target.value);
                              if (pid) handleAssignPartner(p.id, pid, p.collectionCenterId);
                            }}
                            className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#091813] px-2 py-1 text-xs"
                          >
                            <option value="">Assign partner...</option>
                            {partners.map((pt) => (
                              <option key={pt.id} value={pt.id}>
                                {pt.fullName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300">
                            {p.assignedPartner?.fullName ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap space-x-1.5">
                        {p.status === "assigned" && (
                          <button
                            type="button"
                            onClick={() => handlePickupAction(p.id, "schedule")}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-900 font-bold"
                          >
                            Confirm Schedule
                          </button>
                        )}
                        {p.status === "collected" && (
                          <button
                            type="button"
                            onClick={() => handlePickupAction(p.id, "verify_collection")}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white font-bold"
                          >
                            Verify Weight
                          </button>
                        )}
                        {p.discrepancyFlag && (
                          <button
                            type="button"
                            onClick={() => handlePickupAction(p.id, "resolve_discrepancy")}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-100 text-rose-800 font-bold"
                          >
                            Clear Alert
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BATCHES, DISCREPANCIES & INTERNAL EPR */}
      {activeTab === "batches" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 space-y-4">
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
              Recycling Batch Verification & Discrepancy Oversight ({batches.length})
            </h2>
            <div className="space-y-3">
              {batches.map((b) => (
                <div
                  key={b.id}
                  className={`rounded-2xl border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs ${
                    b.discrepancyFlag
                      ? "border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20"
                      : "border-slate-200 dark:border-emerald-900 bg-slate-50/50 dark:bg-[#091813]"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-emerald-900 dark:text-emerald-300">
                        {b.batchCode}
                      </span>
                      <BatchStatusBadge status={b.status} />
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      Dispatched: <strong>{b.dispatchedWeightKg} kg</strong> ({b.dispatchedQty}{" "}
                      units) • Received: <strong>{b.receivedWeightKg ?? "—"} kg</strong> •
                      Documented Recycled: <strong>{b.documentedRecyclingKg ?? "—"} kg</strong>
                    </p>
                    {b.discrepancyNotes && (
                      <p className="text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {b.discrepancyNotes}
                      </p>
                    )}
                  </div>
                  {b.discrepancyFlag && (
                    <button
                      type="button"
                      onClick={() => handleResolveBatchDiscrepancy(b.id)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shrink-0"
                    >
                      Approve After Audit
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Internal EPR Records Table */}
          <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 space-y-4 overflow-x-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-600" />
                  EPR Operational Traceability Records (Non-Statutory)
                </h2>
                <p className="text-xs text-slate-500">
                  Tracks requested, estimated, actual collected, recycler received, processed, and
                  documented weights separately. Never fabricates CPCB certificates.
                </p>
              </div>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-emerald-900 text-slate-500 uppercase">
                  <th className="py-2.5 pr-3">Record</th>
                  <th className="py-2.5 pr-3">Collected</th>
                  <th className="py-2.5 pr-3">Received</th>
                  <th className="py-2.5 pr-3">Documented</th>
                  <th className="py-2.5 pr-3">Docs</th>
                  <th className="py-2.5 pr-3">Internal Status</th>
                  <th className="py-2.5 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/50">
                {eprList.map((e) => (
                  <tr key={e.id}>
                    <td className="py-3 pr-3">
                      <span className="font-mono font-bold block">{e.recordCode}</span>
                      <span className="text-[11px] text-slate-500">
                        {e.reportingPeriod} • {e.category}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-semibold">{e.actualCollectedWeightKg} kg</td>
                    <td className="py-3 pr-3 font-semibold">{e.recyclerReceivedWeightKg} kg</td>
                    <td className="py-3 pr-3 font-bold text-emerald-700 dark:text-emerald-400">
                      {e.documentedRecyclingKg} kg
                    </td>
                    <td className="py-3 pr-3">{e.supportingDocsCount}</td>
                    <td className="py-3 pr-3 font-mono text-[11px]">{e.verificationStatus}</td>
                    <td className="py-3 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateEpr(e.id, "verified_internal")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold"
                      >
                        Verify Internal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateEpr(e.id, "discrepancy_flagged")}
                        className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold"
                      >
                        Flag
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: COLLECTION CENTERS */}
      {activeTab === "centers" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
                Manage Collection Centers ({centers.length})
              </h2>
              <p className="text-xs text-slate-500">
                Includes the Ludhiana, Punjab demonstration drop-off hub (PB-LDH-DEMO-01).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNewCenterOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              Add Demo Center
            </button>
          </div>

          {newCenterOpen && (
            <form
              onSubmit={handleAddCenter}
              className="rounded-3xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-[#0d1f19] p-6 grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <input
                required
                placeholder="Hub Code (e.g. PB-ASR-DEMO-07)"
                value={cCode}
                onChange={(e) => setCCode(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-xs"
              />
              <input
                required
                placeholder="Center Name (Demo Label)"
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-xs"
              />
              <input
                required
                placeholder="City"
                value={cCity}
                onChange={(e) => setCCity(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-xs"
              />
              <input
                required
                placeholder="State"
                value={cState}
                onChange={(e) => setCState(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-xs"
              />
              <input
                required
                placeholder="Public Non-Private Commercial Demo Address"
                value={cAddr}
                onChange={(e) => setCAddr(e.target.value)}
                className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-xs"
              />
              <input
                required
                placeholder="Operating Hours"
                value={cHours}
                onChange={(e) => setCHours(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-700 text-white text-xs font-bold py-2"
              >
                Save Demonstration Hub
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {centers.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {c.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-950 dark:text-white">{c.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleCenter(c)}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      c.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {c.isActive ? "Active" : "Inactive"}
                  </button>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  {c.city}, {c.state} • {c.operatingHours}
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                  {c.verificationLabel}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: USERS & ROLES */}
      {activeTab === "users" && (
        <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 overflow-x-auto">
          <h2 className="text-base font-extrabold text-slate-950 dark:text-white mb-4">
            Users, Collection Partners & Recyclers ({allUsers.length})
          </h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-emerald-900 text-slate-500 uppercase">
                <th className="py-3 pr-4">User</th>
                <th className="py-3 pr-4">Location</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/50">
              {allUsers.map((u) => (
                <tr key={u.id}>
                  <td className="py-3 pr-4">
                    <strong className="block text-slate-900 dark:text-white">{u.fullName}</strong>
                    <span className="font-mono text-[11px] text-slate-500">{u.email}</span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                    {u.city || "—"}, {u.state || "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={u.role}
                      disabled={u.id === user?.id}
                      onChange={(e) =>
                        handleUpdateUser(u.id, { role: e.target.value as UserRole })
                      }
                      className="rounded-lg border border-slate-200 dark:border-emerald-800 bg-white dark:bg-[#091813] px-2 py-1 text-xs"
                    >
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map((rk) => (
                        <option key={rk} value={rk}>
                          {ROLE_LABELS[rk]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        u.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {u.isActive ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {u.id !== user?.id && (
                      <button
                        type="button"
                        onClick={() => handleUpdateUser(u.id, { isActive: !u.isActive })}
                        className="px-3 py-1 rounded-lg border border-slate-200 dark:border-emerald-800 font-semibold hover:bg-slate-100 dark:hover:bg-emerald-950"
                      >
                        {u.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === "audit" && (
        <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
              Administrative & Processing Audit Logs ({auditLogs.length})
            </h2>
            <input
              type="text"
              value={auditQuery}
              onChange={(e) => setAuditQuery(e.target.value)}
              placeholder="Filter action, entity, email..."
              className="rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3.5 py-2 text-xs w-64"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-emerald-900 text-slate-500 uppercase">
                  <th className="py-2.5 pr-4">Timestamp</th>
                  <th className="py-2.5 pr-4">Actor</th>
                  <th className="py-2.5 pr-4">Action</th>
                  <th className="py-2.5 pr-4">Entity</th>
                  <th className="py-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/50">
                {auditLogs
                  .filter((l) =>
                    !auditQuery
                      ? true
                      : `${l.action} ${l.entityType} ${l.entityId ?? ""} ${l.actorEmail ?? ""}`
                          .toLowerCase()
                          .includes(auditQuery.toLowerCase())
                  )
                  .map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-slate-500">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="font-mono">{log.actorEmail}</span>{" "}
                        <span className="text-slate-400">({log.actorRole})</span>
                      </td>
                      <td className="py-2.5 pr-4 font-mono font-bold text-emerald-800 dark:text-emerald-300">
                        {log.action}
                      </td>
                      <td className="py-2.5 pr-4 font-mono">
                        {log.entityType}:{log.entityId}
                      </td>
                      <td className="py-2.5 text-[11px] font-mono text-slate-500 max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: PLATFORM SETTINGS */}
      {activeTab === "settings" && (
        <div className="max-w-3xl space-y-5">
          <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 space-y-4">
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Discrepancy & EPR Governance Controls
            </h2>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">
                  Weight Variance Alert Threshold (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={thresholdPct}
                  onChange={(e) => setThresholdPct(e.target.value)}
                  className="w-36 rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-sm font-bold"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveThreshold}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold"
              >
                <CheckCircle2 className="w-4 h-4" />
                Save Setting
              </button>
            </div>
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-emerald-900/60 text-xs text-slate-600 dark:text-slate-300">
              {settings.map((s) => (
                <div
                  key={s.key}
                  className="rounded-xl bg-slate-50 dark:bg-[#091813] p-3 font-mono text-[11px]"
                >
                  <strong className="text-emerald-800 dark:text-emerald-300">{s.key}</strong>
                  <p className="text-slate-500 font-sans mt-0.5">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
