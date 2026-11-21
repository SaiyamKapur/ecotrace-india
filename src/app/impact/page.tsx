"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  Leaf,
  Scale,
  Recycle,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AnimatedCounter, SkeletonCard } from "@/components/ui-primitives";
import {
  CategoryDonutChart,
  CollectionRecyclingTrendChart,
  RegionalBarChart,
  type AnalyticsPayload,
} from "@/components/impact-charts";
import { TraceabilityLookup } from "@/components/traceability-lookup";

const RANGES = [
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
  { id: "90d", label: "Last 90 Days" },
  { id: "all", label: "All Time" },
];

export default function ImpactPage() {
  const [range, setRange] = useState("all");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async (selectedRange: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?range=${selectedRange}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch analytics.");
      const json = (await res.json()) as AnalyticsPayload;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading impact data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAnalytics(range);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [range]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <section className="bg-gradient-to-br from-[#052e22] via-[#064e3b] to-[#065f46] text-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold uppercase tracking-wider">
                <BarChart3 className="w-3.5 h-3.5" />
                Live Database Sustainability Telemetry
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                Environmental Impact Dashboard
              </h1>
              <p className="text-sm sm:text-base text-emerald-100/85">
                Every chart and metric below queries our live PostgreSQL database with consistent
                date filtering—strictly separating estimated submission weights, actual physical
                collected weights, and documented recycled recovery.
              </p>
            </div>

            {/* Unified Date Range Filter */}
            <div className="flex flex-wrap items-center gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/15">
              <Calendar className="w-4 h-4 text-emerald-300 ml-2" />
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRange(r.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    range === r.id
                      ? "bg-white text-emerald-950 shadow-sm"
                      : "text-emerald-100 hover:bg-white/10"
                  }`}
                >
                  {r.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => loadAnalytics(range)}
                className="p-2 rounded-xl text-emerald-200 hover:bg-white/10"
                title="Refresh metrics"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          {error && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

            <div className="rounded-2xl border border-emerald-300/70 dark:border-emerald-700/60 bg-emerald-50/80 dark:bg-emerald-950/30 p-4 text-xs text-emerald-950 dark:text-emerald-200 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                <strong>Live Platform Telemetry:</strong> Verified database records across window{" "}
                <strong>{data?.dateRange.label}</strong> with documented physical weight and material recovery.
              </span>
            </div>

          {/* KPI Strip */}
          {loading || !data ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <span>Measured Collected</span>
                    <Scale className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="mt-2 text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
                    <AnimatedCounter
                      value={data.kpis.actualCollectedWeightKg}
                      decimals={2}
                      suffix=" kg"
                    />
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    vs ~{data.kpis.estimatedWeightKg.toFixed(2)} kg estimated at submission
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <span>Documented Recycled</span>
                    <Recycle className="w-4 h-4 text-sky-600" />
                  </div>
                  <p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">
                    <AnimatedCounter
                      value={data.kpis.documentedRecyclingKg}
                      decimals={2}
                      suffix=" kg"
                    />
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {data.kpis.documentedBatchesCount} documented batch(es) of {data.kpis.totalBatches}
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <span>Est. CO₂e Avoided</span>
                    <Leaf className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">
                    <AnimatedCounter
                      value={data.environmentalImpact.estimatedCo2AvoidedKg}
                      decimals={1}
                      suffix=" kg"
                    />
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Derived only from documented recycled mass
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <span>Hazardous Diverted</span>
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">
                    <AnimatedCounter
                      value={data.environmentalImpact.hazardousDivertedKg}
                      decimals={2}
                      suffix=" kg"
                    />
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Isolated batteries & toxic fractions
                  </p>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 shadow-sm">
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">
                    Collection & Documented Recycling Trend ({data.dateRange.label})
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Compares initial reference estimates against scale-verified collection and
                    recycler-documented recovery
                  </p>
                  <CollectionRecyclingTrendChart data={data.trends} />
                </div>

                <div className="lg:col-span-5 rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 shadow-sm">
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">
                    Device Category Distribution
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Submitted item counts within {data.dateRange.label}
                  </p>
                  <CategoryDonutChart data={data.categoryDistribution} />
                </div>
              </div>

              {/* Regional Analytics + Material Recovery Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 shadow-sm">
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">
                    Regional Collection Analytics (State-Wise)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Filtered across the same {data.dateRange.label} date window
                  </p>
                  <RegionalBarChart data={data.regionalAnalytics} />
                </div>

                <div className="lg:col-span-5 rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 shadow-sm space-y-4">
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">
                    Documented Material Recovery Fractions
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sum of recycler-documented fractions across completed batches in{" "}
                    {data.dateRange.label}.
                  </p>
                  {[
                    {
                      label: "Recovered Metals (Copper, Aluminum, Steel, Gold)",
                      kg: data.environmentalImpact.metalsRecoveredKg,
                      color: "bg-emerald-600",
                    },
                    {
                      label: "Sorted Engineering Plastics (ABS / PC)",
                      kg: data.environmentalImpact.plasticsRecoveredKg,
                      color: "bg-teal-500",
                    },
                    {
                      label: "Glass Panels & Assemblies",
                      kg: data.environmentalImpact.glassRecoveredKg,
                      color: "bg-sky-500",
                    },
                    {
                      label: "Hazardous Fractions Isolated",
                      kg: data.environmentalImpact.hazardousDivertedKg,
                      color: "bg-amber-500",
                    },
                  ].map((mat) => {
                    const denom = Math.max(data.environmentalImpact.documentedRecyclingKg, 1);
                    const pct = Math.min(100, Math.round((mat.kg / denom) * 100));
                    return (
                      <div key={mat.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {mat.label}
                          </span>
                          <span className="font-bold text-slate-950 dark:text-white tabular-nums">
                            {mat.kg.toFixed(2)} kg
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-emerald-950 overflow-hidden">
                          <div className={`h-full rounded-full ${mat.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Public Traceability Explorer */}
              <div className="pt-4 space-y-4">
                <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">
                  Verify Individual Request & Batch Traceability
                </h2>
                <TraceabilityLookup />
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
