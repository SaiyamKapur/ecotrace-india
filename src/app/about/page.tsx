import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Scale, FileCheck2, MapPin, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-[#052e22] via-[#064e3b] to-[#065f46] text-white py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              Mission, Integrity & Governance
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Building Trust in India&apos;s E-Waste Supply Chain
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/85 max-w-3xl leading-relaxed">
              EcoTrace India was engineered to close the visibility gap between household or
              organizational electronic waste disposal and documented downstream material recovery.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
          {/* Editorial Feature */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">
                Why Radical Honesty Matters in Sustainability Tech
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Many e-waste initiatives blur critical distinctions—guessing weights from photos,
                labeling collected items as &quot;recycled&quot; the moment a truck drives away, or
                claiming regulatory EPR credit without verified processing documentation.
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                EcoTrace India enforces strict stage separation in PostgreSQL: requested quantity,
                estimated weight, actual physical collected weight, recycler gate weight, processed
                quantity, and documented recycling mass are stored as distinct auditable columns.
              </p>
            </div>
            <div className="lg:col-span-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/ewaste-facility.jpg"
                alt="Modern electronic waste sorting and weighing facility"
                className="w-full h-72 object-cover rounded-3xl shadow-xl border border-emerald-900/10 dark:border-emerald-400/15"
              />
            </div>
          </div>

          {/* Core Principles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div
              id="epr"
              className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 space-y-3"
            >
              <FileCheck2 className="w-6 h-6 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                EPR Traceability Policy (Non-Statutory Clarity)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Collected quantities never automatically become legally recognized Extended Producer
                Responsibility (EPR) credits. EcoTrace maintains operational traceability records
                and supporting documentation references for review—without fabricating CPCB
                certificates or legal compliance approvals.
              </p>
            </div>

            <div
              id="privacy"
              className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 space-y-3"
            >
              <Lock className="w-6 h-6 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                Privacy & Server-Side Access Control
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Passwords are salted and hashed using bcrypt. Sessions use SHA-256 hashed random
                tokens stored in PostgreSQL with HTTP-only cookies. Private pickup street addresses
                are enforced via server-side RBAC and redacted from public traceability queries.
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 space-y-3">
              <Scale className="w-6 h-6 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                Discrepancy Detection & Audit Trails
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                If collected quantities differ from citizen submissions, or if recycler gate weight
                deviates significantly from collection center dispatch weight, EcoTrace flags the
                record for human administrative audit and logs every action permanently.
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 space-y-3">
              <MapPin className="w-6 h-6 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                Punjab Sample Collection Network
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Our Ludhiana, Punjab demonstration drop-off hub showcases regional collection center
                discovery, category acceptance filtering, capacity monitoring, and hub-to-recycler
                batching—always transparently labeled as a non-government sample facility.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                  Inspect Technical Architecture, ER Diagram & API Reference
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Full academic & engineering documentation for EcoTrace India.
                </p>
              </div>
            </div>
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shrink-0"
            >
              Open System Docs
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
