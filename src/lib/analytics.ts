import { and, desc, gte, lte } from "drizzle-orm";
import {
  db,
  pickupRequests,
  recyclingBatches,
  collectionCenters,
  users,
  auditLogs,
  traceabilityEvents,
} from "@/db";
import { CATEGORY_MAP } from "@/lib/constants";

export type DateRangePreset = "7d" | "30d" | "90d" | "all" | "custom";

export interface DateRangeWindow {
  preset: DateRangePreset;
  from: Date | null;
  to: Date;
  label: string;
}

export function parseDateRange(params: {
  range?: string | null;
  from?: string | null;
  to?: string | null;
}): DateRangeWindow {
  const now = new Date();
  const range = (params.range || "30d").toLowerCase();

  if (range === "custom" && params.from) {
    const parsedFrom = new Date(params.from);
    const parsedTo = params.to ? new Date(params.to) : now;
    if (!Number.isNaN(parsedFrom.getTime()) && !Number.isNaN(parsedTo.getTime())) {
      parsedTo.setHours(23, 59, 59, 999);
      return {
        preset: "custom",
        from: parsedFrom,
        to: parsedTo,
        label: `${parsedFrom.toISOString().slice(0, 10)} to ${parsedTo.toISOString().slice(0, 10)}`,
      };
    }
  }

  if (range === "7d") {
    return {
      preset: "7d",
      from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      to: now,
      label: "Last 7 Days",
    };
  }
  if (range === "90d") {
    return {
      preset: "90d",
      from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      to: now,
      label: "Last 90 Days",
    };
  }
  if (range === "all") {
    return {
      preset: "all",
      from: null,
      to: now,
      label: "All Time",
    };
  }

  return {
    preset: "30d",
    from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    to: now,
    label: "Last 30 Days",
  };
}

export async function getPlatformAnalytics(window: DateRangeWindow) {
  const reqConditions = [];
  const batchConditions = [];
  const logConditions = [];
  const eventConditions = [];

  if (window.from) {
    reqConditions.push(gte(pickupRequests.createdAt, window.from));
    reqConditions.push(lte(pickupRequests.createdAt, window.to));

    batchConditions.push(gte(recyclingBatches.createdAt, window.from));
    batchConditions.push(lte(recyclingBatches.createdAt, window.to));

    logConditions.push(gte(auditLogs.createdAt, window.from));
    logConditions.push(lte(auditLogs.createdAt, window.to));

    eventConditions.push(gte(traceabilityEvents.createdAt, window.from));
    eventConditions.push(lte(traceabilityEvents.createdAt, window.to));
  }

  const [filteredRequests, filteredBatches, allCenters, allUsers, recentLogs, recentEvents] =
    await Promise.all([
      reqConditions.length > 0
        ? db
            .select()
            .from(pickupRequests)
            .where(and(...reqConditions))
            .orderBy(desc(pickupRequests.createdAt))
        : db.select().from(pickupRequests).orderBy(desc(pickupRequests.createdAt)),
      batchConditions.length > 0
        ? db
            .select()
            .from(recyclingBatches)
            .where(and(...batchConditions))
            .orderBy(desc(recyclingBatches.createdAt))
        : db.select().from(recyclingBatches).orderBy(desc(recyclingBatches.createdAt)),
      db.select().from(collectionCenters),
      db
        .select({
          id: users.id,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users),
      logConditions.length > 0
        ? db
            .select()
            .from(auditLogs)
            .where(and(...logConditions))
            .orderBy(desc(auditLogs.createdAt))
            .limit(15)
        : db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(15),
      eventConditions.length > 0
        ? db
            .select()
            .from(traceabilityEvents)
            .where(and(...eventConditions))
            .orderBy(desc(traceabilityEvents.createdAt))
            .limit(15)
        : db
            .select()
            .from(traceabilityEvents)
            .orderBy(desc(traceabilityEvents.createdAt))
            .limit(15),
    ]);

  // Separate estimated vs measured physical weights clearly!
  let totalEstimatedWeightKg = 0;
  let totalActualCollectedWeightKg = 0;
  let verifiedCollectionCount = 0;
  let pendingApprovalsCount = 0;
  let requestDiscrepancies = 0;
  let demoRecordsCount = 0;
  let liveRecordsCount = 0;

  for (const r of filteredRequests) {
    totalEstimatedWeightKg += r.estimatedWeightKg || 0;
    if (r.actualCollectedWeightKg != null) {
      totalActualCollectedWeightKg += r.actualCollectedWeightKg;
    }
    if (
      [
        "verified",
        "batched",
        "received_by_recycler",
        "processing",
        "documented",
      ].includes(r.status)
    ) {
      verifiedCollectionCount += 1;
    }
    if (["submitted", "reviewed", "collected"].includes(r.status)) {
      pendingApprovalsCount += 1;
    }
    if (r.discrepancyFlag) {
      requestDiscrepancies += 1;
    }
    if (r.isDemoRecord) demoRecordsCount += 1;
    else liveRecordsCount += 1;
  }

  let totalReceivedWeightKg = 0;
  let totalDocumentedRecyclingKg = 0;
  let documentedBatchesCount = 0;
  let batchDiscrepancies = 0;
  let metalsRecoveredKg = 0;
  let plasticsRecoveredKg = 0;
  let glassRecoveredKg = 0;
  let hazardousDivertedKg = 0;

  for (const b of filteredBatches) {
    if (b.receivedWeightKg != null) totalReceivedWeightKg += b.receivedWeightKg;
    if (b.documentedRecyclingKg != null) {
      totalDocumentedRecyclingKg += b.documentedRecyclingKg;
    }
    if (b.status === "documented") documentedBatchesCount += 1;
    if (b.discrepancyFlag || b.status === "discrepancy_review") {
      batchDiscrepancies += 1;
    }
    if (b.recoveryBreakdown) {
      metalsRecoveredKg += b.recoveryBreakdown.metalsKg || 0;
      plasticsRecoveredKg += b.recoveryBreakdown.plasticsKg || 0;
      glassRecoveredKg += b.recoveryBreakdown.glassKg || 0;
      hazardousDivertedKg += b.recoveryBreakdown.hazardousDivertedKg || 0;
    }
  }

  // Time-series collection & recycling trends using the SAME filtered window
  const trendMap = new Map<
    string,
    {
      date: string;
      requests: number;
      estimatedWeightKg: number;
      actualCollectedWeightKg: number;
      documentedRecyclingKg: number;
    }
  >();

  const formatBucket = (d: Date) => {
    if (window.preset === "7d") {
      return d.toISOString().slice(0, 10);
    }
    if (window.preset === "30d") {
      return d.toISOString().slice(0, 10);
    }
    // Group by ISO week or YYYY-MM for longer periods
    const copy = new Date(d);
    const day = copy.getDay();
    copy.setDate(copy.getDate() - day);
    return copy.toISOString().slice(0, 10);
  };

  for (const r of filteredRequests) {
    const key = formatBucket(new Date(r.createdAt));
    const entry = trendMap.get(key) ?? {
      date: key,
      requests: 0,
      estimatedWeightKg: 0,
      actualCollectedWeightKg: 0,
      documentedRecyclingKg: 0,
    };
    entry.requests += 1;
    entry.estimatedWeightKg += r.estimatedWeightKg || 0;
    entry.actualCollectedWeightKg += r.actualCollectedWeightKg || 0;
    trendMap.set(key, entry);
  }

  for (const b of filteredBatches) {
    const key = formatBucket(new Date(b.documentedAt ?? b.createdAt));
    const entry = trendMap.get(key) ?? {
      date: key,
      requests: 0,
      estimatedWeightKg: 0,
      actualCollectedWeightKg: 0,
      documentedRecyclingKg: 0,
    };
    entry.documentedRecyclingKg += b.documentedRecyclingKg || 0;
    trendMap.set(key, entry);
  }

  const trends = Array.from(trendMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => ({
      ...t,
      estimatedWeightKg: Number(t.estimatedWeightKg.toFixed(2)),
      actualCollectedWeightKg: Number(t.actualCollectedWeightKg.toFixed(2)),
      documentedRecyclingKg: Number(t.documentedRecyclingKg.toFixed(2)),
    }));

  // Category distribution (donut chart) from filtered requests
  const categoryAgg = new Map<
    string,
    { category: string; quantity: number; estimatedWeightKg: number; color: string }
  >();
  for (const r of filteredRequests) {
    for (const item of r.items || []) {
      const existing = categoryAgg.get(item.category) ?? {
        category: item.category,
        quantity: 0,
        estimatedWeightKg: 0,
        color: CATEGORY_MAP[item.category]?.color ?? "#10b981",
      };
      existing.quantity += item.quantity || 0;
      existing.estimatedWeightKg += item.estimatedTotalWeightKg || 0;
      categoryAgg.set(item.category, existing);
    }
  }

  const categoryDistribution = Array.from(categoryAgg.values())
    .sort((a, b) => b.quantity - a.quantity)
    .map((c) => ({
      ...c,
      estimatedWeightKg: Number(c.estimatedWeightKg.toFixed(2)),
    }));

  // Regional analytics (by state) from filtered requests
  const regionAgg = new Map<
    string,
    {
      state: string;
      requests: number;
      estimatedWeightKg: number;
      actualCollectedWeightKg: number;
      centersCount: number;
    }
  >();

  for (const c of allCenters) {
    const existing = regionAgg.get(c.state) ?? {
      state: c.state,
      requests: 0,
      estimatedWeightKg: 0,
      actualCollectedWeightKg: 0,
      centersCount: 0,
    };
    existing.centersCount += 1;
    regionAgg.set(c.state, existing);
  }

  for (const r of filteredRequests) {
    const existing = regionAgg.get(r.state) ?? {
      state: r.state,
      requests: 0,
      estimatedWeightKg: 0,
      actualCollectedWeightKg: 0,
      centersCount: 0,
    };
    existing.requests += 1;
    existing.estimatedWeightKg += r.estimatedWeightKg || 0;
    existing.actualCollectedWeightKg += r.actualCollectedWeightKg || 0;
    regionAgg.set(r.state, existing);
  }

  const regionalAnalytics = Array.from(regionAgg.values())
    .sort((a, b) => b.actualCollectedWeightKg - a.actualCollectedWeightKg || b.requests - a.requests)
    .map((reg) => ({
      ...reg,
      estimatedWeightKg: Number(reg.estimatedWeightKg.toFixed(2)),
      actualCollectedWeightKg: Number(reg.actualCollectedWeightKg.toFixed(2)),
    }));

  // Estimated CO2e avoidance (clearly labeled as engineering estimate based on documented recycled mass, ~1.44 kg CO2e/kg e-waste)
  const estimatedCo2AvoidedKg = Number((totalDocumentedRecyclingKg * 1.44).toFixed(2));

  return {
    dateRange: {
      preset: window.preset,
      label: window.label,
      from: window.from ? window.from.toISOString() : null,
      to: window.to.toISOString(),
    },
    dataDisclaimer: {
      includesDemoSampleData: demoRecordsCount > 0,
      demoRecordsCount,
      liveRecordsCount,
      note:
        demoRecordsCount > 0
          ? "Metrics reflect PostgreSQL records; sample entries are separately labeled."
          : "Metrics reflect live PostgreSQL database records.",
    },
    kpis: {
      totalRequests: filteredRequests.length,
      verifiedCollectionCount,
      activeCentersCount: allCenters.filter((c) => c.isActive).length,
      totalCentersCount: allCenters.length,
      totalBatches: filteredBatches.length,
      documentedBatchesCount,
      pendingApprovalsCount,
      discrepanciesCount: requestDiscrepancies + batchDiscrepancies,
      totalUsers: allUsers.length,
      estimatedWeightKg: Number(totalEstimatedWeightKg.toFixed(2)),
      actualCollectedWeightKg: Number(totalActualCollectedWeightKg.toFixed(2)),
      recyclerReceivedWeightKg: Number(totalReceivedWeightKg.toFixed(2)),
      documentedRecyclingKg: Number(totalDocumentedRecyclingKg.toFixed(2)),
    },
    environmentalImpact: {
      documentedRecyclingKg: Number(totalDocumentedRecyclingKg.toFixed(2)),
      estimatedCo2AvoidedKg,
      metalsRecoveredKg: Number(metalsRecoveredKg.toFixed(2)),
      plasticsRecoveredKg: Number(plasticsRecoveredKg.toFixed(2)),
      glassRecoveredKg: Number(glassRecoveredKg.toFixed(2)),
      hazardousDivertedKg: Number(hazardousDivertedKg.toFixed(2)),
      methodologyNote:
        "CO2e avoidance is an estimate derived strictly from documented recycled weight (1.44 kg CO2e/kg), never from unverified estimates or mere collection.",
    },
    trends,
    categoryDistribution,
    regionalAnalytics,
    recentActivity: recentEvents.map((e) => ({
      id: e.id,
      stage: e.stage,
      title: e.title,
      description: e.description,
      actorName: e.actorName,
      actorRole: e.actorRole,
      location: e.location,
      createdAt: e.createdAt,
    })),
    recentAuditLogs: recentLogs,
  };
}
