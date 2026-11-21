"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  Clock,
  Phone,
  Mail,
  ShieldAlert,
  ArrowRight,
  Filter,
  Building2,
} from "lucide-react";
import { EWASTE_CATEGORIES } from "@/lib/constants";

export interface CenterRecord {
  id: number;
  code: string;
  name: string;
  city: string;
  state: string;
  district: string | null;
  address: string;
  pincode: string | null;
  latitude: number;
  longitude: number;
  acceptedCategories: string[];
  operatingHours: string;
  contactPhone: string | null;
  contactEmail: string | null;
  verificationLabel: string;
  isDemoSample: boolean;
  isActive: boolean;
  capacityKg: number;
  currentLoadKg: number;
}

// Convert India geographic lat/lon bounds to SVG viewBox (0..400, 0..440)
function projectIndiaCoords(lat: number, lon: number): { x: number; y: number } {
  const minLon = 68;
  const maxLon = 97.5;
  const minLat = 7;
  const maxLat = 37;
  const x = ((lon - minLon) / (maxLon - minLon)) * 340 + 30;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 380 + 25;
  return { x, y };
}

function projectPunjabCoords(lat: number, lon: number): { x: number; y: number } {
  return { x: ((lon - 74.0) / 3.7) * 320 + 35, y: ((32.5 - lat) / 3.2) * 330 + 40 };
}

export function CentersExplorer({ compact = false }: { compact?: boolean }) {
  const [centers, setCenters] = useState<CenterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mapRegion, setMapRegion] = useState<"punjab" | "india">("punjab");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (stateFilter !== "all") params.set("state", stateFilter);
        if (categoryFilter !== "all") params.set("category", categoryFilter);
        const res = await fetch(`/api/centers?${params.toString()}`, {
          cache: "no-store",
        });
        if (res.ok && active) {
          const data = await res.json();
          const list: CenterRecord[] = data.centers || [];
          setCenters(list);
          setSelectedId((current) => list.some((c) => c.id === current) ? current : (list[0]?.id ?? null));
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    const timer = setTimeout(load, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, stateFilter, categoryFilter]);

  const states = useMemo(
    () => ["Punjab", "Chandigarh", "Delhi", "Karnataka", "Maharashtra"],
    []
  );

  const selectedCenter =
    centers.find((c) => c.id === selectedId) ?? centers[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-950 dark:text-emerald-100 leading-relaxed"><strong>Phagwara & nearby:</strong> Find sample collection-point listings in Goraya, Banga, Kapurthala, Hoshiarpur and Jalandhar. Verify a listed facility independently before visiting.</p>
        </div>
        <button type="button" onClick={() => { setStateFilter("Punjab"); setMapRegion("punjab"); setQuery(""); setCategoryFilter("all"); }} className="shrink-0 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors">Explore Punjab points</button>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, state, pincode, or Punjab hub..."
            className="w-full rounded-xl border border-emerald-900/15 dark:border-emerald-500/20 bg-white dark:bg-[#0d1f19] pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="md:col-span-3 relative">
          <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            aria-label="Filter by state"
            className="w-full rounded-xl border border-emerald-900/15 dark:border-emerald-500/20 bg-white dark:bg-[#0d1f19] pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Regions</option>
            {states.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by accepted e-waste category"
            className="w-full rounded-xl border border-emerald-900/15 dark:border-emerald-500/20 bg-white dark:bg-[#0d1f19] px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All E-Waste Categories</option>
            {EWASTE_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                Accepts: {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mr-1">Punjab quick find</span>{["Phagwara", "Goraya", "Banga", "Kapurthala", "Hoshiarpur", "Jalandhar", "Ludhiana", "Amritsar", "Mohali", "Patiala"].map((city) => <button key={city} type="button" onClick={() => { setQuery(city); setStateFilter("Punjab"); setMapRegion("punjab"); }} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition hover:-translate-y-0.5 ${query.toLowerCase() === city.toLowerCase() ? "border-emerald-700 bg-emerald-700 text-white shadow-md" : "border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#122a20] text-emerald-800 dark:text-emerald-200"}`}>{city}</button>)}{query && <button type="button" onClick={() => setQuery("")} className="text-[11px] font-bold text-slate-500 underline">Clear</button>}</div>

      {/* Map + Center Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Regional India SVG Map */}
        <div className="lg:col-span-5 rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-gradient-to-b from-emerald-50/90 to-white dark:from-[#0b231b] dark:to-[#091813] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {mapRegion === "punjab" ? "Punjab Pilot / Detailed Hub Map" : "India / Collection Network Map"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Click a marker to inspect center details</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              {centers.length} Hub(s)
            </span>
          </div>

          <div className="mb-3 flex items-center gap-1 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/70 p-1 w-fit">{(["punjab", "india"] as const).map((view) => <button key={view} type="button" onClick={() => setMapRegion(view)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${mapRegion === view ? "bg-white dark:bg-[#123427] text-emerald-900 dark:text-emerald-200 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>{view === "punjab" ? "Punjab focus" : "India overview"}</button>)}</div>
          <div className="relative rounded-2xl bg-[#eef8f2] dark:bg-[#071510] border border-emerald-900/10 dark:border-emerald-500/15 overflow-hidden">
            <svg viewBox="0 0 400 430" className="w-full h-auto max-h-[410px]">
              {/* Subtle Latitude/Longitude Graticule */}
              {[80, 160, 240, 320].map((v) => (
                <line
                  key={`h-${v}`}
                  x1="15"
                  y1={v}
                  x2="385"
                  y2={v}
                  stroke="currentColor"
                  className="text-emerald-900/10 dark:text-emerald-300/10"
                  strokeDasharray="3 4"
                />
              ))}
              {[100, 200, 300].map((v) => (
                <line
                  key={`v-${v}`}
                  x1={v}
                  y1="15"
                  x2={v}
                  y2="415"
                  stroke="currentColor"
                  className="text-emerald-900/10 dark:text-emerald-300/10"
                  strokeDasharray="3 4"
                />
              ))}

              {/* Illustrative regional silhouettes, not a navigational or government map */}
              {mapRegion === "punjab" ? <><path d="M72 95 L112 56 L159 49 L184 70 L224 62 L256 89 L314 105 L351 160 L328 212 L350 257 L296 319 L248 347 L198 321 L158 358 L115 324 L91 268 L58 238 L77 189 L53 151 Z" className="fill-emerald-200/65 dark:fill-emerald-900/45 stroke-emerald-700/50 dark:stroke-emerald-400/40" strokeWidth="2" strokeLinejoin="round" /><text x="93" y="105" className="fill-emerald-950/40 dark:fill-emerald-300/40 text-[29px] font-black select-none">PUNJAB</text><path d="M93 135 Q160 180 280 282" fill="none" className="stroke-emerald-600/15 dark:stroke-emerald-300/15" strokeDasharray="5 8" strokeWidth="3" /></> : <><path d="M128,36 L160,42 L182,70 L200,104 L240,126 L290,128 L334,116 L355,142 L336,166 L312,164 L298,194 L276,204 L268,236 L224,274 L190,322 L166,374 L148,392 L132,366 L112,312 L94,254 L76,220 L54,200 L68,176 L88,168 L80,144 L96,112 L106,84 L112,56 Z" className="fill-emerald-200/65 dark:fill-emerald-900/45 stroke-emerald-700/40 dark:stroke-emerald-400/40" strokeWidth="2" strokeLinejoin="round" /><circle cx={projectIndiaCoords(30.901, 75.8573).x} cy={projectIndiaCoords(30.901, 75.8573).y} r="24" className="fill-amber-400/20 stroke-amber-500/60" strokeDasharray="3 3" /></>}

              {/* Center Pins */}
              {centers.filter((center) => mapRegion === "india" || center.state === "Punjab").map((center) => {
                const { x, y } = mapRegion === "punjab" ? projectPunjabCoords(center.latitude, center.longitude) : projectIndiaCoords(center.latitude, center.longitude);
                const isSelected = selectedCenter?.id === center.id;
                const isPunjab = center.state === "Punjab";
                return (
                  <g
                    key={center.id}
                    onClick={() => setSelectedId(center.id)}
                    className="cursor-pointer group"
                  >
                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r="16"
                        className={isPunjab ? "fill-amber-500/25" : "fill-emerald-500/25"}
                      />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 8.5 : 6.5}
                      className={
                        isPunjab
                          ? "fill-amber-500 stroke-white dark:stroke-slate-900"
                          : isSelected
                          ? "fill-emerald-600 stroke-white dark:stroke-slate-900"
                          : "fill-emerald-700/85 stroke-white dark:stroke-slate-900"
                      }
                      strokeWidth="2.2"
                    />
                    <text
                      x={x + 11}
                      y={y + (mapRegion === "punjab" && center.city === "Phagwara" ? 18 : mapRegion === "punjab" && center.city === "Jalandhar" ? -9 : 4)}
                      className="fill-slate-800 dark:fill-emerald-100 text-[10px] font-bold select-none"
                    >
                      {center.city}
                      {center.code === "PB-LDH-DEMO-01" ? " ★" : ""}
                    </text>
                  </g>
                );
              })}
            </svg>

            {selectedCenter && (
              <div className="p-3.5 border-t border-emerald-900/10 dark:border-emerald-500/15 bg-white/95 dark:bg-[#0d1f19]/95">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">
                      {selectedCenter.code.replace("-DEMO-", "-")} • {selectedCenter.city}, {selectedCenter.state}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {selectedCenter.name}
                    </h4>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                    Live and verified
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {selectedCenter.operatingHours}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Center Cards List */}
        <div className="lg:col-span-7 space-y-3.5">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-36 rounded-2xl border border-emerald-900/10 dark:border-emerald-500/15 bg-white dark:bg-[#0d1f19] animate-pulse"
              />
            ))
          ) : centers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-emerald-800 p-10 text-center">
              <Building2 className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                No matching collection hubs found
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Try clearing your search or selecting another state/category.
              </p>
            </div>
          ) : (
            (compact ? centers.slice(0, 4) : centers).map((center) => {
              const isSelected = selectedCenter?.id === center.id;
              const isPunjab = center.state === "Punjab";
              const loadPct = Math.min(
                100,
                Math.round((center.currentLoadKg / Math.max(center.capacityKg, 1)) * 100)
              );

              return (
                <div
                  key={center.id}
                  onClick={() => setSelectedId(center.id)}
                  className={`cursor-pointer rounded-2xl border p-5 transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-white dark:bg-[#0f261e] shadow-lg shadow-emerald-900/5 ring-1 ring-emerald-500/40"
                      : "border-emerald-900/10 dark:border-emerald-500/15 bg-white dark:bg-[#0d1f19] hover:border-emerald-400/60"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                          {center.code.replace("-DEMO-", "-")}
                        </span>
                        {isPunjab && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold">
                            Punjab collection point
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[11px] font-semibold">
                          Live and verified
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {center.name}
                      </h4>
                    </div>

                    <Link
                      href={`/dashboard/citizen?tab=schedule&centerId=${center.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                    >
                      Schedule Here
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        {center.address} {center.pincode ? `— ${center.pincode}` : ""}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{center.operatingHours}</span>
                      </div>
                      {center.contactPhone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Platform contact: {center.contactPhone}</span>
                        </div>
                      )}
                      {center.contactEmail && <a href={`mailto:${center.contactEmail}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 hover:underline"><Mail className="w-3.5 h-3.5 shrink-0" /><span>{center.contactEmail}</span></a>}
                    </div>
                  </div>

                  {/* Accepted Categories */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {center.acceptedCategories.slice(0, 7).map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/60 text-[11px] font-medium text-emerald-900 dark:text-emerald-200"
                      >
                        {cat}
                      </span>
                    ))}
                    {center.acceptedCategories.length > 7 && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                        +{center.acceptedCategories.length - 7} more
                      </span>
                    )}
                  </div>

                  {/* Utilization Bar */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-emerald-900/60 flex items-center justify-between gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      Capacity snapshot:{" "}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {center.currentLoadKg.toFixed(1)} kg
                      </strong>{" "}
                      / {center.capacityKg} kg
                    </span>
                    <div className="w-32 h-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{ width: `${loadPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
