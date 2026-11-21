"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export interface AnalyticsPayload {
  dateRange: {
    preset: string;
    label: string;
    from: string | null;
    to: string;
  };
  dataDisclaimer: {
    includesDemoSampleData: boolean;
    demoRecordsCount: number;
    liveRecordsCount: number;
    note: string;
  };
  kpis: {
    totalRequests: number;
    verifiedCollectionCount: number;
    activeCentersCount: number;
    totalCentersCount: number;
    totalBatches: number;
    documentedBatchesCount: number;
    pendingApprovalsCount: number;
    discrepanciesCount: number;
    totalUsers: number;
    estimatedWeightKg: number;
    actualCollectedWeightKg: number;
    recyclerReceivedWeightKg: number;
    documentedRecyclingKg: number;
  };
  environmentalImpact: {
    documentedRecyclingKg: number;
    estimatedCo2AvoidedKg: number;
    metalsRecoveredKg: number;
    plasticsRecoveredKg: number;
    glassRecoveredKg: number;
    hazardousDivertedKg: number;
    methodologyNote: string;
  };
  trends: Array<{
    date: string;
    requests: number;
    estimatedWeightKg: number;
    actualCollectedWeightKg: number;
    documentedRecyclingKg: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    quantity: number;
    estimatedWeightKg: number;
    color: string;
  }>;
  regionalAnalytics: Array<{
    state: string;
    requests: number;
    estimatedWeightKg: number;
    actualCollectedWeightKg: number;
    centersCount: number;
  }>;
  recentActivity: Array<{
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

export function CollectionRecyclingTrendChart({
  data,
}: {
  data: AnalyticsPayload["trends"];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
        No collection or recycling activity recorded in this date window.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradDocumented" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit=" kg" />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid rgba(16,185,129,0.25)",
              backgroundColor: "rgba(9, 25, 19, 0.94)",
              color: "#ecfdf5",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Area
            type="monotone"
            dataKey="actualCollectedWeightKg"
            name="Actual Collected (kg)"
            stroke="#10b981"
            strokeWidth={2.5}
            fill="url(#gradCollected)"
          />
          <Area
            type="monotone"
            dataKey="documentedRecyclingKg"
            name="Documented Recycled (kg)"
            stroke="#0284c7"
            strokeWidth={2.5}
            fill="url(#gradDocumented)"
          />
          <Area
            type="monotone"
            dataKey="estimatedWeightKg"
            name="Initial Estimate (kg)"
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeWidth={1.8}
            fill="none"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDonutChart({
  data,
}: {
  data: AnalyticsPayload["categoryDistribution"];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
        No categorized items recorded in this date window.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
      <div className="sm:col-span-6 h-60">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="quantity"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={84}
              paddingAngle={3}
            >
              {data.map((entry) => (
                <Cell key={entry.category} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid rgba(16,185,129,0.25)",
                backgroundColor: "rgba(9, 25, 19, 0.94)",
                color: "#ecfdf5",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="sm:col-span-6 space-y-2 max-h-60 overflow-y-auto pr-1">
        {data.map((item) => (
          <div
            key={item.category}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                {item.category}
              </span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white tabular-nums shrink-0">
              {item.quantity} pcs
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RegionalBarChart({
  data,
}: {
  data: AnalyticsPayload["regionalAnalytics"];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
        No regional records in this date window.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
          <XAxis dataKey="state" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit=" kg" />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid rgba(16,185,129,0.25)",
              backgroundColor: "rgba(9, 25, 19, 0.94)",
              color: "#ecfdf5",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Bar
            dataKey="actualCollectedWeightKg"
            name="Actual Collected (kg)"
            fill="#059669"
            radius={[6, 6, 0, 0]}
          />
          <Bar
            dataKey="estimatedWeightKg"
            name="Estimated Weight (kg)"
            fill="#6ee7b7"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
