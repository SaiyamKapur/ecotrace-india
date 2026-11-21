"use client";

import React, { useEffect, useState } from "react";
import { BATCH_STATUS_META, PICKUP_STATUS_META } from "@/lib/constants";
import type { BatchStatus, PickupStatus } from "@/db/schema";

export function AnimatedCounter({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  durationMs = 900,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const startVal = 0;
    const target = Number.isFinite(value) ? value : 0;
    const startTime = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(startVal + (target - startVal) * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs]);

  return (
    <span className="tabular-nums">
      {prefix}
      {display.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

export function ProgressRing({
  percent,
  size = 56,
  stroke = 5,
  color = "#10b981",
  label,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-emerald-100 dark:text-emerald-950"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-slate-800 dark:text-slate-100 tabular-nums">
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}

export function MiniSparkline({
  data,
  color = "#10b981",
  height = 32,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const safe = data.length >= 2 ? data : [0, data[0] ?? 1];
  const max = Math.max(...safe, 1);
  const min = Math.min(...safe, 0);
  const range = Math.max(max - min, 1);
  const width = 100;

  const points = safe
    .map((val, idx) => {
      const x = (idx / (safe.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-24 h-8 overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function PickupStatusBadge({ status }: { status: PickupStatus }) {
  const meta = PICKUP_STATUS_META[status] ?? {
    label: status,
    badgeClass: "bg-slate-100 text-slate-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const meta = BATCH_STATUS_META[status] ?? {
    label: status,
    badgeClass: "bg-slate-100 text-slate-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-emerald-900/10 dark:border-emerald-500/10 bg-white dark:bg-[#0d1f19] p-5 animate-pulse ${className}`}
    >
      <div className="h-3.5 w-24 rounded bg-emerald-100 dark:bg-emerald-950 mb-3" />
      <div className="h-7 w-32 rounded bg-slate-200 dark:bg-emerald-900/50 mb-2" />
      <div className="h-3 w-40 rounded bg-slate-100 dark:bg-emerald-950/70" />
    </div>
  );
}
