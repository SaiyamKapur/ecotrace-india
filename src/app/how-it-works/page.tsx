"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Camera,
  MapPin,
  CalendarClock,
  Truck,
  Scale,
  Boxes,
  Recycle,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DEMO_COVERAGE_AREAS } from "@/lib/constants";

const WORKFLOW_STAGES = [
  {
    step: "1",
    title: "Upload E-Waste Photo & Multi-Device AI Review",
    icon: Camera,
    detail:
      "Snap a single device or multiple electronics together (e.g., two mobile phones, a laptop, and cables). Our AI-assisted identification helps suggest visible categories and estimated counts when a live vision model is connected, or runs an honestly labeled Demo Mode fallback. You can always correct categories and enter exact quantities manually.",
    callout:
      "Important: Image analysis NEVER determines exact physical weight. Displayed weights at submission are reference estimates only.",
  },
  {
    step: "2",
    title: "Address Entry & Private Location Handling",
    icon: MapPin,
    detail:
      "Enter your street address, city, state, and pincode within a configured demonstration service zone. Your private street address is visible strictly to you, operations administrators, and your assigned collection partner—it is never exposed in public traceability lookups.",
    callout:
      "Only city/state and collection hub milestones appear in public traceability records.",
  },
  {
    step: "3",
    title: "Pickup Scheduling & Operations Review",
    icon: CalendarClock,
    detail:
      "Choose your preferred pickup date and time window (Morning, Afternoon, or Late Afternoon). The system generates a unique tracking ID (e.g., ECO-2026-XXXX). Administrators review the request and confirm hub routing.",
    callout:
      "Citizens can cancel a request anytime prior to physical collection.",
  },
  {
    step: "4",
    title: "Collection Partner Assignment & Doorstep Pickup",
    icon: Truck,
    detail:
      "An authorized demonstration collection partner receives your pickup manifest, confirms the arrival slot, and collects the electronics directly from your location or accepts walk-in drop-off at a listed demonstration center.",
    callout:
      "Every assignment and schedule change writes an immutable timestamped traceability event.",
  },
  {
    step: "5",
    title: "Physical Scale Weighment (Actual Collected Weight)",
    icon: Scale,
    detail:
      "At physical handover, the collection partner counts items and weighs the lot on a calibrated scale. The actual collected quantity and actual collected weight (kg) are saved separately from your initial AI/reference estimate. Significant variances automatically raise a discrepancy flag for human review.",
    callout:
      "Collected e-waste is strictly marked 'Collected'—NOT 'Recycled'.",
  },
  {
    step: "6",
    title: "Hub Verification & Outbound Recycling Batching",
    icon: Boxes,
    detail:
      "Collection Center Managers (including the Ludhiana, Punjab Demonstration Hub) verify the incoming physical weight and consolidate verified collections into a traceable outbound recycling batch (e.g., BATCH-2026-PB01).",
    callout:
      "Green Points are awarded to citizens only after verified physical collection.",
  },
  {
    step: "7",
    title: "Recycler Gate Receipt & Discrepancy Safeguards",
    icon: Recycle,
    detail:
      "Upon arrival at the recycling facility, the recycler confirms physical receipt and logs independent gate weighbridge weight along with accepted and rejected quantities. If gate weight differs by >10% from dispatched weight, the batch is automatically held for administrative discrepancy review.",
    callout:
      "Prevents leakage and ensures honest mass balance across custody handoffs.",
  },
  {
    step: "8",
    title: "Material Recovery & Supporting Recycling Documentation",
    icon: FileCheck2,
    detail:
      "Once dismantling and material recovery complete, the recycler logs processed quantities, recovered fractions (metals, plastics, glass, circuit boards, hazardous diversions), and attaches supporting documentation (weighbridge slips & processing logs). Your citizen timeline updates immediately.",
    callout:
      "Internal EPR records track documented weights honestly without fabricating statutory CPCB certificates.",
  },
];

const DELIVERY_FAQS = [
  {
    q: "Is doorstep pickup available nationwide across all of India?",
    a: "No. EcoTrace India displays only configured demonstration pilot coverage zones (starting with Punjab — Ludhiana & Tri-City, plus sample pilot hubs in Delhi NCR, Bengaluru, Mumbai, and Pune). We do not claim nationwide doorstep coverage.",
  },
  {
    q: "What happens if I upload a photo containing multiple different devices?",
    a: "Multi-device detection breaks the photo into separate editable device rows (for example, Mobile Phones, Laptops, and Chargers). You verify or adjust each category and count before submitting. Final physical quantity and weight are always confirmed during doorstep pickup.",
  },
  {
    q: "Why are Estimated Weight, Collected Weight, Received Weight, and Recycled Weight shown separately?",
    a: "Because honest sustainability reporting requires mass-balance integrity. An image estimate is only a rough planning guide; physical scale weighment happens at collection; gate weight is re-verified by the recycler; and documented recycled mass is logged only after processing completes.",
  },
];

export default function HowItWorksPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-gradient-to-br from-[#052e22] via-[#064e3b] to-[#065f46] text-white py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              Collection, Delivery & Location Guide
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              How Collection & Delivery Works
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/85 max-w-3xl leading-relaxed">
              From uploading a multi-device photograph to confirming physical scale weight and
              tracking final recycling documentation—understand every transparent checkpoint in
              EcoTrace India.
            </p>
          </div>
        </section>

        {/* Configured Demonstration Coverage Areas */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
          <div className="rounded-3xl border border-amber-300/80 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-extrabold text-amber-950 dark:text-amber-200">
                  Configured sample coverage areas (not nationwide)
                </h2>
                <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-200/85 leading-relaxed">
                  EcoTrace India displays only the sample pilot service boundaries currently
                  configured in our database. Locations outside these sample pilot zones are not
                  claimed as active doorstep service areas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DEMO_COVERAGE_AREAS.map((area) => (
                <div
                  key={area.hubCode}
                  className="rounded-2xl bg-white dark:bg-[#0d1f19] border border-amber-200/80 dark:border-emerald-800 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300">
                      {area.state}
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                      {area.hubCode}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    {area.label}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                    Demo Cities: <strong>{area.cities.join(", ")}</strong>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 8-Step Detailed Lifecycle */}
          <div className="space-y-4 pt-4">
            <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">
              Step-by-Step Collection, Delivery & Recycling Journey
            </h2>
            <div className="space-y-4">
              {WORKFLOW_STAGES.map((stage) => {
                const Icon = stage.icon;
                return (
                  <div
                    key={stage.step}
                    className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 shadow-sm flex flex-col sm:flex-row gap-5"
                  >
                    <div className="flex sm:flex-col items-center gap-3 shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-800 text-white">
                        Step {stage.step}
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1">
                      <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                        {stage.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {stage.detail}
                      </p>
                      <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 px-3.5 py-2 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{stage.callout}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="pt-8 space-y-4">
            <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">
              Frequently Asked Questions
            </h2>
            {DELIVERY_FAQS.map((faq, idx) => {
              const open = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19]"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 text-sm font-bold text-slate-900 dark:text-white"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-emerald-600 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {open && (
                    <div className="px-5 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-emerald-900/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="pt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/citizen?tab=schedule"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg"
            >
              Schedule a Pickup Request
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/collection-centers"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
            >
              Explore Punjab & Regional Demo Centers
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
