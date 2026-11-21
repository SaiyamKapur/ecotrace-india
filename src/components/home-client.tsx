"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Truck,
  Scale,
  FileCheck2,
  ShieldCheck,
  Users,
  Recycle,
  Building2,
  MapPin,
  CheckCircle2,
  Cpu,
  Leaf,
  ChevronDown,
  BarChart3,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AnimatedCounter } from "@/components/ui-primitives";
import { AiEwasteClassifier } from "@/components/ai-ewaste-classifier";
import { CentersExplorer } from "@/components/centers-explorer";
import { TraceabilityLookup } from "@/components/traceability-lookup";
import { HomeMarketplaceFeature, HomeAssistantFeature } from "@/components/home-premium-sections";
import { EcoImpactSimulator } from "@/components/eco-impact-simulator";
import { TabletJourneyTeaser } from "@/components/tablet-journey-teaser";
import {
  CategoryDonutChart,
  CollectionRecyclingTrendChart,
  type AnalyticsPayload,
} from "@/components/impact-charts";

const STEPS = [
  {
    num: "01",
    title: "Submit E-Waste Request",
    desc: "Upload a photo of single or multiple devices for AI-assisted category suggestions, confirm quantities, and pick your preferred collection slot.",
    icon: Sparkles,
  },
  {
    num: "02",
    title: "Get Connected with Collection Partner",
    desc: "Operations desk reviews service coverage and assigns a verified demonstration collection partner and nearby drop-off hub.",
    icon: Truck,
  },
  {
    num: "03",
    title: "Confirm Collection and Weight",
    desc: "During physical pickup, the partner weighs your e-waste on a calibrated scale—recording actual collected weight separately from estimates.",
    icon: Scale,
  },
  {
    num: "04",
    title: "Track Recycling and Documentation",
    desc: "Follow your batch as the recycler confirms gate weight, processes material recovery, and attaches supporting recycling records.",
    icon: FileCheck2,
  },
];

const STAKEHOLDERS = [
  {
    role: "Citizens",
    badge: "Doorstep & Drop-Off",
    icon: Users,
    desc: "Identify discarded phones, laptops, batteries, and cables via AI photo upload, schedule pickups, view verified collected weight, and earn Green Points.",
    href: "/login?redirect=/dashboard/citizen",
  },
  {
    role: "Collection Partners",
    badge: "First-Mile Logistics",
    icon: Truck,
    desc: "Receive assigned routes, confirm collection time slots, weigh e-waste on-site, record actual physical weights, and hand over to hubs.",
    href: "/login?redirect=/dashboard/partner",
  },
  {
    role: "Recyclers",
    badge: "Material Recovery",
    icon: Recycle,
    desc: "Confirm incoming batch receipt, log gate weights, flag weight discrepancies automatically, document material recovery, and attach supporting logs.",
    href: "/login?redirect=/dashboard/recycler",
  },
  {
    role: "Organizations & Producers",
    badge: "Traceability & EPR",
    icon: Building2,
    desc: "Submit bulk IT refreshes, monitor separate requested vs collected vs documented quantities, and maintain auditable internal EPR records.",
    href: "/login?redirect=/dashboard/organization",
  },
];

const HOME_FAQS = [
  {
    q: "Does AI image detection measure the exact weight of my e-waste?",
    a: "No. Image classification estimates categories and reference averages only. Actual physical weight is strictly measured on a calibrated scale during physical pickup and recorded separately from initial estimates.",
  },
  {
    q: "Is the Punjab collection center a real government-authorized facility?",
    a: "No. The EcoTrace Punjab Demonstration Drop-Off Hub in Ludhiana is clearly labeled as a demonstration/sample facility record created to showcase regional center discovery and workflows.",
  },
  {
    q: "Does collected e-waste automatically count as recycled or as an EPR credit?",
    a: "Never. EcoTrace enforces strict lifecycle stages—collected material stays 'Collected' until a recycler confirms physical gate receipt, processes it, and uploads supporting recycling documentation. Internal EPR records are never misrepresented as statutory CPCB credits.",
  },
];

export function HomeClient({ initialAnalytics }: { initialAnalytics: AnalyticsPayload }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { kpis, environmentalImpact, dataDisclaimer } = initialAnalytics;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* B. HERO SECTION */}
        <section className="relative overflow-hidden eco-grid-bg bg-gradient-to-br from-[#f3faf2] via-[#f8fbf5] to-[#eaf7ed] dark:from-[#071b12] dark:via-[#0a2219] dark:to-[#092519] border-b border-emerald-900/10 dark:border-emerald-400/10">
          {/* Ambient Animated Gradient Orbs */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-400/20 dark:bg-emerald-500/15 blur-3xl animate-pulse-soft" />
          <div className="pointer-events-none absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-teal-300/25 dark:bg-teal-600/15 blur-3xl animate-pulse-soft" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Hero Left Copy */}
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/90 dark:bg-emerald-950/80 border border-emerald-300/70 dark:border-emerald-700/60 px-4 py-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>AI-Powered Circular E-Waste Traceability • India Pilot</span>
                </div>

                <h1 className="animate-rise-in premium-heading text-4xl sm:text-5xl lg:text-[3.6rem] font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.08]">
                  Your E-Waste.{" "}
                  <span className="bg-gradient-to-r from-emerald-800 via-emerald-600 to-teal-500 dark:from-emerald-400 dark:via-teal-300 dark:to-lime-300 bg-clip-text text-transparent animate-gradient-x">
                    Our Responsibility.
                  </span>{" "}
                  A Greener India.
                </h1>

                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                  Give discarded electronics a responsible journey. Connect with collection
                  partners, track your e-waste, and support transparent recycling through one
                  intelligent platform.
                </p>

                <div className="flex flex-wrap gap-3.5 pt-2">
                  <Link
                    href="/dashboard/citizen?tab=schedule"
                    className="premium-button inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-600 hover:from-emerald-700 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-800/25 transition-all"
                  >
                    <span>Schedule a Pickup</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/impact"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-emerald-900/15 dark:border-emerald-400/20 bg-white/90 dark:bg-[#0d1f19] hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 font-bold text-sm shadow-sm transition-all"
                  >
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    <span>Explore Our Impact</span>
                  </Link>
                  <Link href="/journey/tablet" className="inline-flex items-center gap-1.5 px-2 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-300 hover:underline"><span>Watch a tablet journey</span><ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>

                {/* Trust Highlights */}
                <div className="pt-4 grid grid-cols-3 gap-4 max-w-lg">
                  <div className="rounded-2xl bg-white/75 dark:bg-[#0d1f19]/80 border border-emerald-900/10 dark:border-emerald-500/15 p-3">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      12 Categories
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Multi-device AI scan
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/75 dark:bg-[#0d1f19]/80 border border-emerald-900/10 dark:border-emerald-500/15 p-3">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      10-Stage Audit
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pickup to recycling
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/75 dark:bg-[#0d1f19]/80 border border-emerald-900/10 dark:border-emerald-500/15 p-3">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Punjab Pilot
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Phagwara-area points
                    </p>
                  </div>
                </div>
              </div>

              {/* Hero Right Illustration + Floating UI Previews */}
              <div className="lg:col-span-6 relative">
                <div className="relative rounded-[2rem] overflow-hidden border border-emerald-900/10 dark:border-emerald-400/20 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-[#0c261d] dark:via-[#0a1d17] dark:to-[#071611] p-3 shadow-2xl shadow-emerald-950/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/premium-hero.jpg"
                    alt="Electronic devices surrounded by emerald leaves and circular recycling symbols"
                    className="w-full h-[360px] sm:h-[430px] object-cover rounded-[1.5rem]"
                  />

                  {/* Floating Card 1: AI Classification Preview */}
                  <div className="hidden sm:block absolute top-6 left-6 glass-card rounded-2xl p-3.5 shadow-xl max-w-[240px] animate-float-slow">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
                        <Cpu className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-none">
                          AI Multi-Device Scan
                        </p>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          Editable before pickup
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between text-slate-700 dark:text-slate-200">
                        <span>Mobile Phones</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">2 pcs</span>
                      </div>
                      <div className="flex justify-between text-slate-700 dark:text-slate-200">
                        <span>Laptops</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">1 pc</span>
                      </div>
                      <div className="flex justify-between text-slate-700 dark:text-slate-200">
                        <span>Est. Reference Wt.</span>
                        <span className="font-semibold">~2.48 kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Floating Card 2: Live Pickup Tracking Preview */}
                  <div className="hidden sm:block absolute bottom-6 right-6 glass-card rounded-2xl p-3.5 shadow-xl max-w-[260px] animate-float-delayed">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300">
                        ECO-2026-1001
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        Documented
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                      Actual collected: <strong>6.40 kg</strong> verified at Ludhiana Punjab Hub →
                      Batch <span className="font-mono">PB01</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* C. IMPACT OVERVIEW (REAL DB METRICS) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
          <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 sm:p-8 shadow-xl shadow-emerald-950/5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Live Platform Impact Overview
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {dataDisclaimer.note}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Live Verified Records
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-emerald-50/70 dark:bg-[#091913] border border-emerald-200/60 dark:border-emerald-800/60 p-5">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Collection Requests
                </p>
                <p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">
                  <AnimatedCounter value={kpis.totalRequests} />
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {kpis.verifiedCollectionCount} verified physical collections
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50/70 dark:bg-[#091913] border border-emerald-200/60 dark:border-emerald-800/60 p-5">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Verified Collected Weight
                </p>
                <p className="mt-2 text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
                  <AnimatedCounter value={kpis.actualCollectedWeightKg} decimals={1} suffix=" kg" />
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Measured on scale (Est: ~{kpis.estimatedWeightKg} kg)
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50/70 dark:bg-[#091913] border border-emerald-200/60 dark:border-emerald-800/60 p-5">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Collection Centers
                </p>
                <p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">
                  <AnimatedCounter value={kpis.activeCentersCount} />
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Phagwara & Punjab-area points
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50/70 dark:bg-[#091913] border border-emerald-200/60 dark:border-emerald-800/60 p-5">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Recycling Records
                </p>
                <p className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-white">
                  <AnimatedCounter value={kpis.documentedBatchesCount} />
                  <span className="text-sm font-semibold text-slate-500 ml-1">
                    / {kpis.totalBatches} batches
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {kpis.documentedRecyclingKg.toFixed(1)} kg documented recovery
                </p>
              </div>
            </div>
          </div>
        </section>

        <HomeMarketplaceFeature />
        <TabletJourneyTeaser />

        {/* D. HOW IT WORKS */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                End-to-End Lifecycle
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                How EcoTrace Collection & Traceability Works
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
                Every discarded device moves through verified physical checkpoints—so collected
                material is never prematurely labeled as recycled.
              </p>
            </div>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
            >
              Read Full Delivery & Location Guide
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="group relative rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-2xl font-extrabold text-emerald-900/15 dark:text-emerald-300/20">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* E. AI E-WASTE IDENTIFICATION */}
        <section
          id="ai-scanner"
          className="bg-emerald-50/60 dark:bg-[#091813] border-y border-emerald-900/10 dark:border-emerald-400/10 py-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Assisted Multi-Device Identification
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                Snap Your E-Waste. Verify Categories in Seconds.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
                Upload a photo containing one or multiple devices (phones, laptops, monitors,
                chargers, batteries, circuit boards). Review and correct categories or quantities
                anytime, then send directly into your pickup request.
              </p>
            </div>

            <AiEwasteClassifier />
          </div>
        </section>

        <HomeAssistantFeature />
        <EcoImpactSimulator />

        {/* F. FIND COLLECTION CENTERS */}
        <section id="centers" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                <MapPin className="w-3.5 h-3.5" />
                Demonstration Drop-Off Discovery
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                Find a collection point near you
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
                Search by city, state, or accepted device category across Phagwara, Goraya, Banga, Jalandhar and other listed Punjab areas. Sample locations are identified on each card.
              </p>
            </div>
            <Link
              href="/collection-centers"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
            >
              Open Full Collection Centers Directory
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <CentersExplorer compact />
        </section>

        {/* G. E-WASTE TRACEABILITY */}
        <section
          id="traceability"
          className="bg-emerald-50/50 dark:bg-[#091813] border-y border-emerald-900/10 dark:border-emerald-400/10 py-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                Transparent Chain of Custody
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                Trace Every Request from Pickup to Recycling
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
                Look up any pickup request or recycling batch code to verify timestamps, physical
                weights, discrepancy checks, and supporting recycler documentation.
              </p>
            </div>

            <TraceabilityLookup />
          </div>
        </section>

        {/* H. ENVIRONMENTAL IMPACT (DARK FOREST GREEN FEATURE SECTION) */}
        <section className="bg-gradient-to-br from-[#042f24] via-[#064e3b] to-[#052e22] text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  <Leaf className="w-3.5 h-3.5" />
                  Verified Environmental Impact
                </span>
                <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Measured Recovery, Zero Greenwashing
                </h2>
                <p className="mt-3 text-sm sm:text-base text-emerald-100/80">
                  {environmentalImpact.methodologyNote}
                </p>
              </div>
              <Link
                href="/impact"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-sm transition-colors shrink-0"
              >
                Open Full Impact Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Material Recovery Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-5">
                <p className="text-xs text-emerald-200/80">Documented Recycled Mass</p>
                <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold tabular-nums">
                  {environmentalImpact.documentedRecyclingKg.toFixed(1)} kg
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-5">
                <p className="text-xs text-emerald-200/80">Est. CO₂e Avoided</p>
                <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-lime-300 tabular-nums">
                  {environmentalImpact.estimatedCo2AvoidedKg.toFixed(1)} kg
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-5">
                <p className="text-xs text-emerald-200/80">Recovered Metals</p>
                <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold tabular-nums">
                  {environmentalImpact.metalsRecoveredKg.toFixed(1)} kg
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-5">
                <p className="text-xs text-emerald-200/80">Hazardous Fractions Diverted</p>
                <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-amber-300 tabular-nums">
                  {environmentalImpact.hazardousDivertedKg.toFixed(1)} kg
                </p>
              </div>
            </div>

            {/* Live Recharts Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#0d1f19] text-slate-900 dark:text-white p-6 shadow-xl">
                <h3 className="text-sm font-bold mb-1">
                  Collection vs Documented Recycling Trend (All Recorded Data)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Separately plots Initial Estimates, Physical Collected Weight, and Documented
                  Recycling Mass
                </p>
                <CollectionRecyclingTrendChart data={initialAnalytics.trends} />
              </div>

              <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#0d1f19] text-slate-900 dark:text-white p-6 shadow-xl">
                <h3 className="text-sm font-bold mb-1">E-Waste Category Distribution</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Device volume across submitted database pickup requests
                </p>
                <CategoryDonutChart data={initialAnalytics.categoryDistribution} />
              </div>
            </div>
          </div>
        </section>

        {/* I. STAKEHOLDER SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              Multi-Stakeholder Ecosystem
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              Purpose-Built Role Portals for Every Participant
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Every participant has a dedicated secure workspace. Sign in with the appropriate role account to follow the same accountable material journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {STAKEHOLDERS.map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.role}
                  className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
                        {st.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                      {st.role}
                    </h3>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {st.desc}
                    </p>
                  </div>
                  <Link
                    href={st.href}
                    className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    Access Portal
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Interactive FAQ Accordion */}
          <div className="max-w-3xl mx-auto pt-4">
            <h3 className="text-xl font-extrabold text-center text-slate-950 dark:text-white mb-6">
              Transparency & Verification FAQ
            </h3>
            <div className="space-y-3">
              {HOME_FAQS.map((faq, idx) => {
                const open = openFaq === idx;
                return (
                  <div
                    key={faq.q}
                    className="rounded-2xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : idx)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 dark:text-white"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-emerald-600 shrink-0 transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {open && (
                      <div className="px-5 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-emerald-900/50 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* J. FINAL CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 p-8 sm:p-14 text-center text-white shadow-2xl">
            <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="relative max-w-2xl mx-auto space-y-5">
              <span className="inline-block px-3.5 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold uppercase tracking-wider">
                Ready to Recycle Responsibly?
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                Small Actions. A More Circular Future.
              </h2>
              <p className="text-sm sm:text-base text-emerald-100/85">
                Start with a single old phone or schedule an organizational batch pickup—tracked
                transparently from doorstep to documented material recovery.
              </p>
              <div className="flex flex-wrap justify-center gap-3.5 pt-2">
                <Link
                  href="/dashboard/citizen?tab=schedule"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white text-emerald-950 font-bold text-sm hover:bg-emerald-50 transition-colors shadow-lg"
                >
                  Schedule a Pickup
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboards"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-400/30 text-white font-bold text-sm hover:bg-emerald-950/80 transition-colors"
                >
                  Explore Role Dashboards
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
