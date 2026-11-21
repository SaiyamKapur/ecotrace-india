"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Package,
  Scale,
  Recycle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Play,
  Upload,
  X,
  ClipboardCheck,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { useApp } from "@/components/providers";
import {
  AnimatedCounter,
  BatchStatusBadge,
  SkeletonCard,
} from "@/components/ui-primitives";
import type {
  BatchStatus,
  RecoveryBreakdown,
  SupportingDocumentRecord,
} from "@/db/schema";

interface BatchRow {
  id: number;
  batchCode: string;
  status: BatchStatus;
  dispatchedQty: number;
  dispatchedWeightKg: number;
  receivedWeightKg: number | null;
  acceptedQty: number | null;
  rejectedQty: number | null;
  processedQty: number | null;
  documentedRecyclingKg: number | null;
  recoveryBreakdown: RecoveryBreakdown | null;
  supportingDocuments: SupportingDocumentRecord[];
  eprReviewStatus: string;
  discrepancyFlag: boolean;
  discrepancyNotes: string | null;
  processingNotes: string | null;
  createdAt: string;
  receivedAt: string | null;
  documentedAt: string | null;
  collectionCenter: { id: number; code: string; name: string; city: string; state: string } | null;
  linkedRequests: Array<{
    id: number;
    requestCode: string;
    status: string;
    city: string;
    state: string;
    actualCollectedQty: number | null;
    actualCollectedWeightKg: number | null;
  }>;
}

export default function RecyclerDashboardPage() {
  const { user, toast, fireConfetti } = useApp();
  const [activeTab, setActiveTab] = useState("batches");
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Action Modals
  const [receiptModal, setReceiptModal] = useState<BatchRow | null>(null);
  const [recWeight, setRecWeight] = useState("");
  const [acceptedQty, setAcceptedQty] = useState("");
  const [rejectedQty, setRejectedQty] = useState("0");
  const [recNotes, setRecNotes] = useState("");

  const [docModal, setDocModal] = useState<BatchRow | null>(null);
  const [procQty, setProcQty] = useState("");
  const [docRecycledKg, setDocRecycledKg] = useState("");
  const [metalsKg, setMetalsKg] = useState("");
  const [plasticsKg, setPlasticsKg] = useState("");
  const [glassKg, setGlassKg] = useState("");
  const [pcbKg, setPcbKg] = useState("");
  const [hazardKg, setHazardKg] = useState("");
  const [docTitle, setDocTitle] = useState("Dismantling & Recovery Manifest");
  const [docType, setDocType] = useState("Processing Log");
  const [docRef, setDocRef] = useState("");
  const [docFileName, setDocFileName] = useState("recovery-log.pdf");
  const [procNotes, setProcNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/batches", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      void loadBatches();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user, loadBatches]);

  const openReceipt = (b: BatchRow) => {
    setReceiptModal(b);
    setRecWeight(String(b.dispatchedWeightKg));
    setAcceptedQty(String(b.dispatchedQty));
    setRejectedQty("0");
    setRecNotes("");
  };

  const openDocumentModal = (b: BatchRow) => {
    setDocModal(b);
    const baseWt = b.receivedWeightKg ?? b.dispatchedWeightKg;
    setProcQty(String(b.acceptedQty ?? b.dispatchedQty));
    setDocRecycledKg((baseWt * 0.92).toFixed(2));
    setMetalsKg((baseWt * 0.42).toFixed(2));
    setPlasticsKg((baseWt * 0.25).toFixed(2));
    setGlassKg((baseWt * 0.13).toFixed(2));
    setPcbKg((baseWt * 0.12).toFixed(2));
    setHazardKg((baseWt * 0.06).toFixed(2));
    setDocRef(`PROC-${b.batchCode}`);
    setDocFileName(`${b.batchCode.toLowerCase()}-recovery-record.pdf`);
    setProcNotes("");
  };

  const handleConfirmReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptModal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/batches/${receiptModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_receipt",
          receivedWeightKg: Number(recWeight),
          acceptedQty: Number(acceptedQty),
          rejectedQty: Number(rejectedQty),
          processingNotes: recNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error confirming receipt", description: data.error, variant: "error" });
        return;
      }
      toast({
        title: data.batch.discrepancyFlag
          ? "Receipt Logged with Discrepancy Alert"
          : "Batch Gate Receipt Confirmed",
        description: data.batch.discrepancyFlag
          ? "Variance exceeded threshold; flagged for admin review."
          : `${receiptModal.batchCode} received at ${recWeight} kg.`,
        variant: data.batch.discrepancyFlag ? "warning" : "success",
      });
      setReceiptModal(null);
      await loadBatches();
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartProcessing = async (b: BatchRow) => {
    const res = await fetch(`/api/batches/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start_processing",
        processingNotes: "Dismantling, hazardous isolation, and material sorting initiated.",
      }),
    });
    if (res.ok) {
      toast({ title: `Processing Started: ${b.batchCode}`, variant: "success" });
      await loadBatches();
    } else {
      const d = await res.json();
      toast({ title: "Failed", description: d.error, variant: "error" });
    }
  };

  const handleDocumentProcessing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docModal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/batches/${docModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "document_processing",
          processedQty: Number(procQty),
          documentedRecyclingKg: Number(docRecycledKg),
          recoveryBreakdown: {
            metalsKg: Number(metalsKg) || 0,
            plasticsKg: Number(plasticsKg) || 0,
            glassKg: Number(glassKg) || 0,
            circuitBoardsKg: Number(pcbKg) || 0,
            hazardousDivertedKg: Number(hazardKg) || 0,
          },
          document: {
            title: docTitle,
            docType,
            referenceNo: docRef,
            fileName: docFileName,
            notes: "Internal operational recycling documentation.",
          },
          processingNotes: procNotes || "Completed documented dismantling & recovery.",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Documentation failed", description: data.error, variant: "error" });
        return;
      }
      fireConfetti();
      toast({
        title: `Recycling Documented: ${docModal.batchCode}`,
        description: "Citizens & EPR traceability logs updated.",
        variant: "success",
      });
      setDocModal(null);
      await loadBatches();
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsvReport = () => {
    const headers = [
      "Batch Code",
      "Status",
      "Dispatched Qty",
      "Dispatched Weight (kg)",
      "Received Weight (kg)",
      "Accepted Qty",
      "Rejected Qty",
      "Processed Qty",
      "Documented Recycling (kg)",
      "Supporting Docs",
      "Discrepancy Flag",
    ];
    const rows = batches.map((b) => [
      b.batchCode,
      b.status,
      b.dispatchedQty,
      b.dispatchedWeightKg,
      b.receivedWeightKg ?? "",
      b.acceptedQty ?? "",
      b.rejectedQty ?? "",
      b.processedQty ?? "",
      b.documentedRecyclingKg ?? "",
      (b.supportingDocuments || []).length,
      b.discrepancyFlag ? "YES" : "NO",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecotrace-recycler-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV Report Exported", variant: "success" });
  };

  // Metrics
  const incomingCount = batches.filter((b) => b.status === "dispatched" || b.status === "created").length;
  const receivedCount = batches.filter((b) => b.status === "received" || b.status === "discrepancy_review").length;
  const processingCount = batches.filter((b) => b.status === "processing").length;
  const completedCount = batches.filter((b) => b.status === "documented").length;
  const totalReceivedWeight = batches.reduce((s, b) => s + (b.receivedWeightKg ?? 0), 0);
  const discrepancyBatches = batches.filter((b) => b.discrepancyFlag || b.status === "discrepancy_review");

  const visibleBatches =
    activeTab === "discrepancies"
      ? discrepancyBatches
      : activeTab === "history"
      ? batches.filter((b) => b.status === "documented")
      : batches;

  return (
    <DashboardShell
      title="Recycler Operations Dashboard"
      subtitle="Confirm incoming batches, log gate weighbridge weights, monitor discrepancies & document recycling"
      allowedRoles={["recycler", "admin"]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={[
        { id: "batches", label: "Incoming & Active Batches", icon: Package, badge: incomingCount },
        { id: "discrepancies", label: "Discrepancy Alerts", icon: AlertTriangle, badge: discrepancyBatches.length },
        { id: "history", label: "Processing History", icon: ClipboardCheck },
        { id: "reports", label: "Reports & Docs", icon: FileText },
      ]}
      headerActions={
        <button
          type="button"
          onClick={exportCsvReport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-xs font-bold"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      }
    >
      {/* Top 5 KPI Metrics */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5">
            <p className="text-xs font-semibold text-slate-500">Incoming Batches</p>
            <p className="mt-2 text-2xl font-extrabold text-amber-600">
              <AnimatedCounter value={incomingCount} />
            </p>
            <p className="text-[11px] text-slate-500">Awaiting gate receipt</p>
          </div>
          <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5">
            <p className="text-xs font-semibold text-slate-500">Received Batches</p>
            <p className="mt-2 text-2xl font-extrabold text-sky-600">
              <AnimatedCounter value={receivedCount} />
            </p>
            <p className="text-[11px] text-slate-500">Gate weighed</p>
          </div>
          <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5">
            <p className="text-xs font-semibold text-slate-500">Processing in Progress</p>
            <p className="mt-2 text-2xl font-extrabold text-indigo-600">
              <AnimatedCounter value={processingCount} />
            </p>
            <p className="text-[11px] text-slate-500">Dismantling & recovery</p>
          </div>
          <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-5">
            <p className="text-xs font-semibold text-slate-500">Completed Processing</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
              <AnimatedCounter value={completedCount} />
            </p>
            <p className="text-[11px] text-slate-500">With documentation</p>
          </div>
          <div className="col-span-2 lg:col-span-1 rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-700 text-white p-5">
            <div className="flex items-center justify-between text-xs text-emerald-200 font-semibold">
              <span>Total Received Wt.</span>
              <Scale className="w-4 h-4" />
            </div>
            <p className="mt-2 text-2xl font-extrabold tabular-nums">
              <AnimatedCounter value={totalReceivedWeight} decimals={1} suffix=" kg" />
            </p>
            <p className="text-[11px] text-emerald-200/80">Verified gate mass</p>
          </div>
        </div>
      )}

      {activeTab === "reports" ? (
        <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
                Recycling Documentation & Mass-Balance Summary
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Internal operational processing documentation. Never auto-generates statutory CPCB
                certificates.
              </p>
            </div>
            <button
              type="button"
              onClick={exportCsvReport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold"
            >
              <Download className="w-4 h-4" />
              Download Batch Report (CSV)
            </button>
          </div>

          <div className="space-y-3">
            {batches.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-slate-200 dark:border-emerald-900 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    {b.batchCode}
                  </span>{" "}
                  <BatchStatusBadge status={b.status} />
                  <p className="mt-1 text-slate-500">
                    Dispatched: <strong>{b.dispatchedWeightKg} kg</strong> → Received:{" "}
                    <strong>{b.receivedWeightKg ?? "—"} kg</strong> → Documented Recycled:{" "}
                    <strong>{b.documentedRecyclingKg ?? "—"} kg</strong>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(b.supportingDocuments || []).length === 0 ? (
                    <span className="text-slate-400">No documents attached yet</span>
                  ) : (
                    b.supportingDocuments.map((doc) => (
                      <span
                        key={doc.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-medium"
                      >
                        <FileText className="w-3 h-3" />
                        {doc.title} ({doc.referenceNo})
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleBatches.length === 0 && !loading ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-emerald-800 bg-white dark:bg-[#0d1f19] p-12 text-center text-sm text-slate-500">
              No batches in this view right now.
            </div>
          ) : (
            visibleBatches.map((b) => (
              <div
                key={b.id}
                className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-emerald-900 dark:text-emerald-300">
                        {b.batchCode}
                      </span>
                      <BatchStatusBadge status={b.status} />
                      {b.discrepancyFlag && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          Discrepancy Alert
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Origin Hub: <strong>{b.collectionCenter?.name ?? "EcoTrace Hub"}</strong> (
                      {b.collectionCenter?.city}, {b.collectionCenter?.state})
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {(b.status === "dispatched" || b.status === "created") && (
                      <button
                        type="button"
                        onClick={() => openReceipt(b)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        Confirm Receipt & Weigh
                      </button>
                    )}

                    {(b.status === "received" || b.status === "discrepancy_review") && (
                      <button
                        type="button"
                        onClick={() => handleStartProcessing(b)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Start Processing
                      </button>
                    )}

                    {b.status === "processing" && (
                      <button
                        type="button"
                        onClick={() => openDocumentModal(b)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Document Processing & Upload Docs
                      </button>
                    )}
                  </div>
                </div>

                {/* Weight & Quantity Mass-Balance Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div className="rounded-xl bg-slate-50 dark:bg-[#091813] p-3">
                    <span className="text-slate-500 block">Dispatched Manifest</span>
                    <strong className="text-slate-900 dark:text-white text-sm">
                      {b.dispatchedWeightKg.toFixed(2)} kg
                    </strong>
                    <span className="block text-[11px] text-slate-500">{b.dispatchedQty} items</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-[#091813] p-3">
                    <span className="text-slate-500 block">Gate Received Wt.</span>
                    <strong className="text-emerald-700 dark:text-emerald-400 text-sm">
                      {b.receivedWeightKg != null ? `${b.receivedWeightKg.toFixed(2)} kg` : "Pending"}
                    </strong>
                    <span className="block text-[11px] text-slate-500">
                      {b.acceptedQty != null
                        ? `${b.acceptedQty} acc / ${b.rejectedQty ?? 0} rej`
                        : "Unweighed"}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-[#091813] p-3">
                    <span className="text-slate-500 block">Processed Qty</span>
                    <strong className="text-slate-900 dark:text-white text-sm">
                      {b.processedQty ?? "—"}
                    </strong>
                    <span className="block text-[11px] text-slate-500">Units dismantled</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-[#091813] p-3">
                    <span className="text-slate-500 block">Documented Recycled</span>
                    <strong className="text-sky-700 dark:text-sky-400 text-sm">
                      {b.documentedRecyclingKg != null
                        ? `${b.documentedRecyclingKg.toFixed(2)} kg`
                        : "Pending"}
                    </strong>
                    <span className="block text-[11px] text-slate-500">Non-statutory log</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-[#091813] p-3">
                    <span className="text-slate-500 block">Supporting Docs</span>
                    <strong className="text-slate-900 dark:text-white text-sm">
                      {(b.supportingDocuments || []).length} file(s)
                    </strong>
                    <span className="block text-[11px] text-slate-500">
                      {b.linkedRequests.length} linked pickup(s)
                    </span>
                  </div>
                </div>

                {b.discrepancyNotes && (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{b.discrepancyNotes}</span>
                  </div>
                )}

                {b.linkedRequests.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="text-slate-500 font-semibold">Linked Pickups:</span>
                    {b.linkedRequests.map((lr) => (
                      <span
                        key={lr.id}
                        className="font-mono text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                      >
                        {lr.requestCode} ({lr.actualCollectedWeightKg ?? "?"} kg)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: CONFIRM RECEIPT */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmReceipt}
            className="max-w-lg w-full rounded-3xl bg-white dark:bg-[#0d1f19] border border-emerald-900/15 dark:border-emerald-400/20 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                Confirm Gate Receipt — {receiptModal.batchCode}
              </h3>
              <button type="button" onClick={() => setReceiptModal(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Dispatched manifest: <strong>{receiptModal.dispatchedWeightKg} kg</strong> (
              {receiptModal.dispatchedQty} items). Variances &gt;10% or rejected items will
              automatically flag a discrepancy alert for admin review.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Received Wt (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={recWeight}
                  onChange={(e) => setRecWeight(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Accepted Qty</label>
                <input
                  type="number"
                  required
                  value={acceptedQty}
                  onChange={(e) => setAcceptedQty(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Rejected Qty</label>
                <input
                  type="number"
                  required
                  value={rejectedQty}
                  onChange={(e) => setRejectedQty(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Intake Notes</label>
              <textarea
                rows={2}
                value={recNotes}
                onChange={(e) => setRecNotes(e.target.value)}
                placeholder="Weighbridge ticket number or rejection notes..."
                className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReceiptModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold"
              >
                {submitting ? "Saving..." : "Confirm Physical Receipt"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: DOCUMENT PROCESSING */}
      {docModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleDocumentProcessing}
            className="max-w-xl w-full max-h-[88vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0d1f19] border border-emerald-900/15 dark:border-emerald-400/20 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                <Recycle className="w-5 h-5 text-emerald-600" />
                Document Recycling — {docModal.batchCode}
              </h3>
              <button type="button" onClick={() => setDocModal(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Processed Units Qty</label>
                <input
                  type="number"
                  required
                  value={procQty}
                  onChange={(e) => setProcQty(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Documented Recycled Wt (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={docRecycledKg}
                  onChange={(e) => setDocRecycledKg(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50/60 dark:bg-[#091813] p-4 space-y-2">
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                Material Recovery Breakdown (kg)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { label: "Metals", val: metalsKg, set: setMetalsKg },
                  { label: "Plastics", val: plasticsKg, set: setPlasticsKg },
                  { label: "Glass", val: glassKg, set: setGlassKg },
                  { label: "PCBs", val: pcbKg, set: setPcbKg },
                  { label: "Hazardous", val: hazardKg, set: setHazardKg },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="block text-[10px] text-slate-500 mb-0.5">{f.label}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={f.val}
                      onChange={(e) => f.set(e.target.value)}
                      className="w-full rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0d1f19] px-2 py-1.5 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-emerald-900 p-4 space-y-3">
              <p className="text-xs font-bold flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                Attach Supporting Recycling Document
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Document Title"
                  className="rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  value={docRef}
                  onChange={(e) => setDocRef(e.target.value)}
                  placeholder="Reference No (e.g. PROC-2026-09)"
                  className="rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  placeholder="Document Type"
                  className="rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  value={docFileName}
                  onChange={(e) => setDocFileName(e.target.value)}
                  placeholder="Filename (PDF)"
                  className="rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Processing Notes</label>
              <textarea
                rows={2}
                value={procNotes}
                onChange={(e) => setProcNotes(e.target.value)}
                placeholder="Dismantling methodology or hazardous isolation details..."
                className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-[#081712] px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDocModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting ? "Documenting..." : "Complete & Publish Documentation"}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}
