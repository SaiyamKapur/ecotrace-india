import React from "react";
import Link from "next/link";
import { BookOpen, Database, Server, ShieldCheck, GitBranch, Download, FileText } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const API_ENDPOINTS = [
  { method: "POST", path: "/api/auth/login", auth: "Public", desc: "Authenticates registered users with bcrypt hash verification and issues a PostgreSQL-backed HTTP-only session cookie." },
  { method: "POST", path: "/api/auth/register", auth: "Public", desc: "Creates a new account (citizen/partner/recycler/organization/center_manager) with strong password validation." },
  { method: "POST", path: "/api/auth/logout", auth: "Authenticated", desc: "Revokes session hash in PostgreSQL and clears cookie." },
  { method: "GET / PATCH", path: "/api/auth/me", auth: "Authenticated", desc: "Returns sanitized user profile + unread notification badge count; updates profile fields." },
  { method: "POST", path: "/api/ai/classify", auth: "Public / Auth", desc: "OpenRouter vision categorizes visible devices when available; OpenAI/Gemini optional; transparent Demo Mode if unavailable. Physical weight always requires a scale." },
  { method: "GET / POST / DELETE", path: "/api/chat", auth: "Guest / Auth", desc: "OpenRouter free-model AI for multilingual conversation with 20 selectable languages; private data grounded locally, 7-language guided fallback and owner-scoped chat history." },
  { method: "GET / POST", path: "/api/listings", auth: "Public safe showcase / Citizen / Org / Admin", desc: "Photo-backed product listings, validated input, server-computed indicative demo values and owner-scoped results." },
  { method: "PATCH", path: "/api/listings/[id]", auth: "Owner / Admin", desc: "Admin-reviewed offer; customer accept/decline with state and ownership checks." },
  { method: "GET / POST", path: "/api/payouts", auth: "Owner / Admin", desc: "Sandbox wallet ledger and eligibility-gated settlement preparation after documented recycling." },
  { method: "PATCH", path: "/api/payouts/[id]", auth: "Admin", desc: "Idempotent approval and simulated wallet credit; no real bank transfer." },
  { method: "GET", path: "/statement/[id]", auth: "Owner / Admin", desc: "Printable privacy-protected sample settlement statement with product photo and amount breakdown; not a tax invoice." },
  { method: "GET", path: "/journey/tablet", auth: "Public (redacted)", desc: "Live database-backed tablet walkthrough from listing and verified weight through recycling to sample wallet credit." },
  { method: "GET", path: "/dashboards", auth: "Public portal directory", desc: "Lists six role workspaces and sends visitors to login with the requested dashboard preserved; no credentials are displayed." },
  { method: "GET / POST", path: "/api/centers", auth: "Public GET / Admin POST", desc: "Searches collection-point listings around Phagwara, Goraya, Banga, Kapurthala and Hoshiarpur; Admin manages hubs." },
  { method: "GET / POST", path: "/api/pickups", auth: "Role-Scoped", desc: "Lists role-scoped pickup requests; Citizens/Orgs submit verified items with separate estimated weight." },
  { method: "GET / PATCH", path: "/api/pickups/[id]", auth: "Role-Scoped", desc: "Enforces strict pickup status transitions (review, assign, schedule, record_collection, verify_collection, cancel)." },
  { method: "GET", path: "/api/trace/[code]", auth: "Public (Redacted)", desc: "Returns chronological chain-of-custody timeline for Request ID or Batch ID while redacting private PII." },
  { method: "GET / POST", path: "/api/batches", auth: "Recycler / Center / Admin", desc: "Lists recycling batches; Center Manager/Admin consolidates verified collections into outbound batches." },
  { method: "PATCH", path: "/api/batches/[id]", auth: "Recycler / Admin", desc: "Confirms receipt + gate weight, flags >10% weight discrepancies, documents recovery & supporting docs." },
  { method: "GET", path: "/api/analytics", auth: "Public / Admin", desc: "Unified date-range analytics (7d/30d/90d/all/custom) driving KPIs, trends, donut, and regional charts." },
  { method: "GET / PATCH", path: "/api/epr", auth: "Org / Recycler / Admin", desc: "Internal operational EPR traceability records with explicit non-statutory disclaimer." },
  { method: "GET / PATCH", path: "/api/admin/users", auth: "Admin", desc: "Manages user roles and active status with audit logging." },
  { method: "GET", path: "/api/admin/audit-logs", auth: "Admin", desc: "Immutable administrative & operational audit trail." },
  { method: "GET / PATCH", path: "/api/admin/settings", auth: "Public GET / Admin PATCH", desc: "Manages demonstration coverage boundaries & discrepancy thresholds." },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-[#052e22] via-[#064e3b] to-[#065f46] text-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              Academic & Engineering Documentation
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              EcoTrace India — System Architecture, ER Schema & API Docs
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/85 max-w-3xl">
              Complete technical blueprint covering Next.js App Router architecture, 13-table
              PostgreSQL relational design, strict status state machines, and REST API endpoints.
            </p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
          <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#053325] to-[#087652] p-7 sm:p-9 text-white shadow-2xl"><div className="pointer-events-none absolute -right-15 -top-20 h-60 w-60 rounded-full bg-lime-300/15 blur-3xl" /><div className="relative flex flex-col md:flex-row md:items-end justify-between gap-5"><div><p className="premium-kicker text-lime-300">ACADEMIC SUBMISSION</p><h2 className="mt-2 text-2xl sm:text-3xl font-extrabold premium-heading">Professional Project Report</h2><p className="mt-2 text-sm text-emerald-100/80">Web App Development with React JS · EcoTrace India</p><p className="mt-1 text-xs text-lime-200 font-semibold">Saiyam Kapur (12404781) • AARJU YADAV (Reg. No. 12404118) • SHILPI RAJ (Reg. No. 12403968)</p><p className="mt-0.5 text-xs text-emerald-200">B.Tech | Computer Science &amp; Engineering • Lovely Professional University</p></div></div></div>
          <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-[#0a2419] p-6 sm:p-8"><p className="premium-kicker text-emerald-700 dark:text-emerald-400">AI PROVIDER / SECURITY & TRANSPARENCY</p><h2 className="mt-2 text-xl font-extrabold text-slate-950 dark:text-white">Server-side OpenRouter integration</h2><p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600 dark:text-slate-300">Tara uses <strong>OPENROUTER_API_KEY</strong> only inside protected server route handlers and defaults to <strong>openrouter/free</strong> for low-volume demonstrations. Users can choose 20 languages or Auto; model quality and free-model availability can vary. General chat questions may be processed by the model provider, but personal request, address and wallet facts are resolved on the server and never included in outbound model context. The scanner attempts multimodal vision, then honestly labels Demo Mode when no usable image result is returned. No photo can establish exact physical weight.</p></div>
          <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0d1f19] p-6 sm:p-8 shadow-sm"><p className="premium-kicker text-emerald-700 dark:text-emerald-400">INT 252 / PRESENTATION READY</p><h2 className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">EcoTrace India · Premium Project Presentation</h2><p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">20 designed slides with genuine application screenshots, PowerPoint transitions, an animated self-contained HTML deck, a printable handout and presenter notes. All figures are drawn from verified project records.</p><div className="mt-5 flex flex-wrap gap-2"><Link href="/presentations/EcoTrace-India-INT252-Premium-Presentation.pptx" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-600"><Download className="h-4 w-4" />PowerPoint</Link><Link href="/presentations/EcoTrace-India-INT252-Animated-Presentation.html" target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-700 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">Animated HTML</Link><Link href="/presentations/EcoTrace-India-INT252-Slide-Handout.pdf" target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-700 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">PDF handout</Link><Link href="/presentations/EcoTrace-India-Presenter-Notes.md" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-700 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">Speaker notes</Link><Link href="/presentations/EcoTrace-India-INT252-Presentation-Package.zip" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-700 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">Complete ZIP</Link><Link href="/reports/DEPLOYMENT.md" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-700 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950">Deployment guide</Link></div></div>
          {/* 1. System Architecture SVG */}
          <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-600" />
              1. Full-Stack System Architecture Diagram
            </h2>
            <div className="overflow-x-auto rounded-2xl bg-emerald-50/60 dark:bg-[#071510] p-4 border border-emerald-900/10 dark:border-emerald-500/15">
              <svg viewBox="0 0 960 320" className="w-full min-w-[720px] h-auto">
                {/* Layer 1: Client / PWA */}
                <rect x="20" y="25" width="210" height="270" rx="18" className="fill-white dark:fill-[#0d1f19] stroke-emerald-600" strokeWidth="2" />
                <text x="125" y="54" textAnchor="middle" className="fill-emerald-800 dark:fill-emerald-300 text-xs font-bold">CLIENT & PWA LAYER</text>
                <rect x="38" y="72" width="174" height="44" rx="10" className="fill-emerald-100 dark:fill-emerald-950" />
                <text x="125" y="98" textAnchor="middle" className="fill-slate-900 dark:fill-white text-[11px] font-semibold">Public Web & Impact Charts</text>
                <rect x="38" y="128" width="174" height="44" rx="10" className="fill-emerald-100 dark:fill-emerald-950" />
                <text x="125" y="154" textAnchor="middle" className="fill-slate-900 dark:fill-white text-[11px] font-semibold">6 Role Dashboards (RBAC)</text>
                <rect x="38" y="184" width="174" height="44" rx="10" className="fill-emerald-100 dark:fill-emerald-950" />
                <text x="125" y="210" textAnchor="middle" className="fill-slate-900 dark:fill-white text-[11px] font-semibold">AI Multi-Device Uploader</text>
                <rect x="38" y="240" width="174" height="38" rx="10" className="fill-teal-100 dark:fill-teal-950" />
                <text x="125" y="263" textAnchor="middle" className="fill-slate-900 dark:fill-white text-[10px] font-semibold">Service Worker + Dark Mode</text>

                {/* Arrows 1->2 */}
                <line x1="230" y1="160" x2="290" y2="160" stroke="#10b981" strokeWidth="2.5" markerEnd="url(#arrow)" />

                {/* Layer 2: Next.js App Router API */}
                <rect x="295" y="25" width="290" height="270" rx="18" className="fill-white dark:fill-[#0d1f19] stroke-emerald-600" strokeWidth="2" />
                <text x="440" y="54" textAnchor="middle" className="fill-emerald-800 dark:fill-emerald-300 text-xs font-bold">NEXT.JS 16 SERVER & API LAYER</text>
                <rect x="315" y="72" width="250" height="40" rx="10" className="fill-emerald-50 dark:fill-emerald-950/70 stroke-emerald-300 dark:stroke-emerald-800" />
                <text x="440" y="96" textAnchor="middle" className="fill-slate-900 dark:fill-white text-[11px] font-semibold">Auth Engine (bcrypt + DB Sessions)</text>
                <rect x="315" y="122" width="250" height="40" rx="10" className="fill-emerald-50 dark:fill-emerald-950/70 stroke-emerald-300 dark:stroke-emerald-800" />
                <text x="440" y="146" textAnchor="middle" className="fill-slate-900 dark:fill-white text-[11px] font-semibold">Pickup & Batch State Machine (Zod)</text>
                <rect x="315" y="172" width="250" height="40" rx="10" className="fill-emerald-50 dark:fill-emerald-950/70 stroke-emerald-300 dark:stroke-emerald-800" />
                <text x="440" y="196" textAnchor="middle" className="fill-slate-900 dark:fill-white text-[11px] font-semibold">Unified Date-Filtered Analytics Service</text>
                <rect x="315" y="222" width="250" height="54" rx="10" className="fill-amber-50 dark:fill-amber-950/50 stroke-amber-400" />
                <text x="440" y="245" textAnchor="middle" className="fill-slate-900 dark:fill-white text-[11px] font-semibold">AI Vision Router (/api/ai/classify)</text>
                <text x="440" y="263" textAnchor="middle" className="fill-amber-800 dark:fill-amber-300 text-[10px]">OpenRouter / optional Vision OR Demo Mode</text>

                {/* Arrows 2->3 */}
                <line x1="585" y1="115" x2="650" y2="115" stroke="#10b981" strokeWidth="2.5" />
                <line x1="585" y1="248" x2="650" y2="248" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="5 4" />

                {/* Layer 3: Data & External AI */}
                <rect x="655" y="25" width="285" height="175" rx="18" className="fill-[#052e22] stroke-emerald-500" strokeWidth="2" />
                <text x="798" y="54" textAnchor="middle" className="fill-emerald-300 text-xs font-bold">POSTGRESQL + DRIZZLE ORM</text>
                <text x="798" y="82" textAnchor="middle" className="fill-white text-[11px]">users • sessions • collection_centers</text>
                <text x="798" y="106" textAnchor="middle" className="fill-white text-[11px]">pickup_requests • recycling_batches</text>
                <text x="798" y="130" textAnchor="middle" className="fill-white text-[11px]">traceability_events • epr_records</text>
                <text x="798" y="154" textAnchor="middle" className="fill-white text-[11px]">notifications • audit_logs • settings</text>
                <text x="798" y="182" textAnchor="middle" className="fill-emerald-300 text-[10px]">ACID Persistence & Audit Trail</text>

                <rect x="655" y="216" width="285" height="79" rx="18" className="fill-white dark:fill-[#0d1f19] stroke-amber-500" strokeWidth="2" strokeDasharray="5 4" />
                <text x="798" y="244" textAnchor="middle" className="fill-amber-700 dark:fill-amber-300 text-xs font-bold">OPTIONAL VISION AI PROVIDERS</text>
                <text x="798" y="266" textAnchor="middle" className="fill-slate-600 dark:text-slate-300 text-[11px]">OPENAI_API_KEY / GEMINI_API_KEY</text>
                <text x="798" y="283" textAnchor="middle" className="fill-slate-500 text-[10px]">Honest Demo Mode when unconfigured</text>
              </svg>
            </div>
          </div>

          {/* 2. Entity Relationship Diagram */}
          <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              2. PostgreSQL Entity-Relationship (ER) Diagram
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  table: "users",
                  pk: "id (PK), email (UNIQUE)",
                  cols: "password_hash, full_name, role, city, state, address, green_points, is_active",
                  rel: "1:N → sessions, pickup_requests, notifications, audit_logs",
                },
                {
                  table: "collection_centers",
                  pk: "id (PK), code (UNIQUE)",
                  cols: "name, city, state, latitude, longitude, accepted_categories (JSONB), operating_hours, verification_label, is_demo_sample",
                  rel: "1:N → pickup_requests, recycling_batches",
                },
                {
                  table: "pickup_requests",
                  pk: "id (PK), request_code (UNIQUE)",
                  cols: "citizen_id (FK), assigned_partner_id (FK), center_id (FK), batch_id (FK), status, items (JSONB), estimated_weight_kg, actual_collected_weight_kg, discrepancy_flag",
                  rel: "1:N → traceability_events",
                },
                {
                  table: "recycling_batches",
                  pk: "id (PK), batch_code (UNIQUE)",
                  cols: "center_id (FK), recycler_id (FK), status, dispatched_weight_kg, received_weight_kg, accepted_qty, rejected_qty, documented_recycling_kg, supporting_documents (JSONB)",
                  rel: "1:N → pickup_requests, epr_records, traceability_events",
                },
                {
                  table: "traceability_events",
                  pk: "id (PK)",
                  cols: "request_id (FK), batch_id (FK), stage, title, description, actor_id, actor_role, location, created_at",
                  rel: "Append-only custody timeline",
                },
                {
                  table: "epr_records & governance",
                  pk: "epr_records, audit_logs, notifications, platform_settings",
                  cols: "Tracks separate requested, collected, received, processed, documented weights + immutable audit trail & thresholds",
                  rel: "Never fabricates statutory CPCB credit",
                },
                {
                  table: "customer marketplace & chat",
                  pk: "product_listings, settlement_records, chat_messages",
                  cols: "Owner-scoped customer product photos, integer-paise reviewed offers, linked pickup records, idempotent simulated credits & private chat history",
                  rel: "List → Quote → Pickup → Document → Approve → Demo Wallet",
                },
              ].map((entity) => (
                <div
                  key={entity.table}
                  className="rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-[#091813] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-extrabold text-emerald-900 dark:text-emerald-300">
                      {entity.table}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200">
                      PG Table
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-amber-700 dark:text-amber-300">
                    {entity.pk}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {entity.cols}
                  </p>
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 pt-1 border-t border-emerald-200/70 dark:border-emerald-900">
                    {entity.rel}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Status Lifecycle State Machine */}
          <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-emerald-600" />
              3. Valid Pickup-to-Recycling State Transitions
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {[
                "submitted",
                "reviewed",
                "assigned",
                "scheduled",
                "collected (physical wt)",
                "verified (hub)",
                "batched",
                "received_by_recycler (gate wt)",
                "processing",
                "documented (final)",
              ].map((st, idx, arr) => (
                <React.Fragment key={st}>
                  <span className="px-3 py-1.5 rounded-xl font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                    {st}
                  </span>
                  {idx < arr.length - 1 && (
                    <span className="text-emerald-600 font-bold">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 4. REST API Reference */}
          <div className="rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              4. REST API Endpoints Reference
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-emerald-900/10 dark:border-emerald-500/20 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 pr-4">Method</th>
                    <th className="py-3 pr-4">Endpoint</th>
                    <th className="py-3 pr-4">Authorization</th>
                    <th className="py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/50">
                  {API_ENDPOINTS.map((ep) => (
                    <tr key={ep.path} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30">
                      <td className="py-3 pr-4 font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {ep.method}
                      </td>
                      <td className="py-3 pr-4 font-mono text-slate-900 dark:text-white whitespace-nowrap">
                        {ep.path}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-emerald-950 text-slate-700 dark:text-emerald-200 font-medium">
                          {ep.auth}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">{ep.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
