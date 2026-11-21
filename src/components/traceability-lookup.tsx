"use client";

import React, { useEffect, useState } from "react";
import {
  Search,
  CheckCircle2,
  FileText,
  Scale,
  AlertTriangle,
  MapPin,
  Clock,
} from "lucide-react";
import { BatchStatusBadge, PickupStatusBadge } from "@/components/ui-primitives";
import type { BatchStatus, PickupStatus } from "@/db/schema";

interface TraceResponse {
  type: "pickup_request" | "recycling_batch";
  record: Record<string, unknown>;
  timeline: Array<{
    id: number;
    stage: string;
    title: string;
    description: string;
    actorName: string | null;
    actorRole: string | null;
    location: string | null;
    createdAt: string;
  }>;
}

const SAMPLE_CODES = ["ECO-2026-1001", "ECO-2026-1004", "BATCH-2026-PB01", "BATCH-2026-KA04"];

export function TraceabilityLookup({ initialCode = "ECO-2026-1001" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TraceResponse | null>(null);

  const lookup = async (targetCode: string) => {
    const clean = targetCode.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trace/${encodeURIComponent(clean)}`, {
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok) {
        setData(null);
        setError(body.error || "Record not found.");
      } else {
        setData(body as TraceResponse);
      }
    } catch {
      setError("Unable to reach traceability service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void lookup(initialCode);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialCode]);

  const rec = data?.record ?? {};

  return (
    <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 sm:p-8 shadow-xl shadow-emerald-950/5 space-y-6">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") lookup(code);
            }}
            placeholder="Enter Request ID (ECO-2026-1001) or Batch ID (BATCH-2026-PB01)"
            className="w-full rounded-xl border border-emerald-900/15 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-[#091813] pl-10 pr-4 py-3 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          type="button"
          onClick={() => lookup(code)}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
        >
          {loading ? "Tracing..." : "Trace Journey"}
        </button>
      </div>

      {/* Quick Sample Codes */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          Sample DB IDs:
        </span>
        {SAMPLE_CODES.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => {
              setCode(sample);
              lookup(sample);
            }}
            className="px-2.5 py-1 rounded-lg font-mono text-[11px] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
          >
            {sample}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Summary Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl bg-emerald-50/70 dark:bg-[#091913] border border-emerald-200/70 dark:border-emerald-800/60 p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-extrabold text-emerald-900 dark:text-emerald-300">
                  {String(rec.requestCode ?? rec.batchCode ?? "")}
                </span>
                {data.type === "pickup_request" ? (
                  <PickupStatusBadge status={rec.status as PickupStatus} />
                ) : (
                  <BatchStatusBadge status={rec.status as BatchStatus} />
                )}
              </div>



              <div className="grid grid-cols-2 gap-3 pt-2">
                {data.type === "pickup_request" ? (
                  <>
                    <div className="rounded-xl bg-white dark:bg-[#0d1f19] p-3 border border-emerald-900/10 dark:border-emerald-500/10">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Estimated Weight
                      </p>
                      <p className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                        ~{Number(rec.estimatedWeightKg ?? 0).toFixed(2)} kg
                      </p>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-[#0d1f19] p-3 border border-emerald-900/10 dark:border-emerald-500/10">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Actual Collected Wt.
                      </p>
                      <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {rec.actualCollectedWeightKg != null
                          ? `${Number(rec.actualCollectedWeightKg).toFixed(2)} kg`
                          : "Pending pickup"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl bg-white dark:bg-[#0d1f19] p-3 border border-emerald-900/10 dark:border-emerald-500/10">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Received Gate Wt.
                      </p>
                      <p className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {rec.receivedWeightKg != null
                          ? `${Number(rec.receivedWeightKg).toFixed(2)} kg`
                          : "In transit"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-[#0d1f19] p-3 border border-emerald-900/10 dark:border-emerald-500/10">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Documented Recycled
                      </p>
                      <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {rec.documentedRecyclingKg != null
                          ? `${Number(rec.documentedRecyclingKg).toFixed(2)} kg`
                          : "Not yet documented"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {Boolean(rec.discrepancyFlag) && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Discrepancy Flagged for Human Administrative Review</span>
                </div>
              )}

              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2 pt-1">
                <Scale className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Collected e-waste is tracked separately from documented recycling and never
                  automatically converted into statutory EPR credit.
                </span>
              </div>
            </div>

            {Array.isArray(rec.supportingDocuments) &&
              (rec.supportingDocuments as Array<{ id: string; title: string; referenceNo: string }>).length >
                0 && (
                <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-500/15 p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    Supporting Recycling Documentation
                  </h4>
                  {(
                    rec.supportingDocuments as Array<{
                      id: string;
                      title: string;
                      referenceNo: string;
                      docType: string;
                    }>
                  ).map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-xl bg-slate-50 dark:bg-[#091813] px-3 py-2 text-xs flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {doc.title}
                      </span>
                      <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                        {doc.referenceNo}
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Chronological Timeline */}
          <div className="lg:col-span-7">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
              Verified Chain-of-Custody Timeline ({data.timeline.length} Events)
            </h4>
            <ol className="relative border-l-2 border-emerald-200 dark:border-emerald-800/80 ml-3 space-y-5">
              {data.timeline.map((ev, idx) => (
                <li key={ev.id} className="ml-6 relative">
                  <span
                    className={`absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white dark:ring-[#0d1f19] ${
                      idx === data.timeline.length - 1
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                  <div className="rounded-2xl border border-emerald-900/10 dark:border-emerald-500/15 bg-slate-50/70 dark:bg-[#091813] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                        {ev.title}
                      </h5>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3" />
                        {new Date(ev.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {ev.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      {ev.actorName && (
                        <span>
                          Actor: <strong className="text-slate-700 dark:text-slate-200">{ev.actorName}</strong> ({ev.actorRole})
                        </span>
                      )}
                      {ev.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
