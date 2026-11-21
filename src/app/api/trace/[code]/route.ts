import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import {
  db,
  pickupRequests,
  recyclingBatches,
  traceabilityEvents,
  collectionCenters,
} from "@/db";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    await ensureSeeded();
    const { code } = await context.params;
    const normalized = decodeURIComponent(code).trim().toUpperCase();

    // Try pickup request code first
    const reqRows = await db
      .select()
      .from(pickupRequests)
      .where(eq(pickupRequests.requestCode, normalized))
      .limit(1);

    if (reqRows.length > 0) {
      const r = reqRows[0];
      const [events, center, batch] = await Promise.all([
        db
          .select()
          .from(traceabilityEvents)
          .where(eq(traceabilityEvents.requestId, r.id))
          .orderBy(asc(traceabilityEvents.createdAt)),
        r.collectionCenterId
          ? db
              .select({
                code: collectionCenters.code,
                name: collectionCenters.name,
                city: collectionCenters.city,
                state: collectionCenters.state,
                verificationLabel: collectionCenters.verificationLabel,
              })
              .from(collectionCenters)
              .where(eq(collectionCenters.id, r.collectionCenterId))
              .limit(1)
          : Promise.resolve([]),
        r.batchId
          ? db
              .select({
                batchCode: recyclingBatches.batchCode,
                status: recyclingBatches.status,
                receivedWeightKg: recyclingBatches.receivedWeightKg,
                documentedRecyclingKg: recyclingBatches.documentedRecyclingKg,
                supportingDocuments: recyclingBatches.supportingDocuments,
                eprReviewStatus: recyclingBatches.eprReviewStatus,
              })
              .from(recyclingBatches)
              .where(eq(recyclingBatches.id, r.batchId))
              .limit(1)
          : Promise.resolve([]),
      ]);

      // Public response omits private street address and citizen PII
      return NextResponse.json({
        type: "pickup_request",
        record: {
          requestCode: r.requestCode,
          status: r.status,
          city: r.city,
          state: r.state,
          requestedTotalQty: r.requestedTotalQty,
          estimatedWeightKg: r.estimatedWeightKg,
          actualCollectedQty: r.actualCollectedQty,
          actualCollectedWeightKg: r.actualCollectedWeightKg,
          items: r.items.map((i) => ({
            category: i.category,
            quantity: i.quantity,
            estimatedTotalWeightKg: i.estimatedTotalWeightKg,
          })),
          discrepancyFlag: r.discrepancyFlag,
          isDemoRecord: r.isDemoRecord,
          createdAt: r.createdAt,
          collectedAt: r.collectedAt,
          verifiedAt: r.verifiedAt,
          collectionCenter: center[0] ?? null,
          batch: batch[0] ?? null,
        },
        timeline: events,
      });
    }

    // Try batch code
    const batchRows = await db
      .select()
      .from(recyclingBatches)
      .where(eq(recyclingBatches.batchCode, normalized))
      .limit(1);

    if (batchRows.length > 0) {
      const b = batchRows[0];
      const events = await db
        .select()
        .from(traceabilityEvents)
        .where(eq(traceabilityEvents.batchId, b.id))
        .orderBy(asc(traceabilityEvents.createdAt));

      return NextResponse.json({
        type: "recycling_batch",
        record: {
          batchCode: b.batchCode,
          status: b.status,
          dispatchedQty: b.dispatchedQty,
          dispatchedWeightKg: b.dispatchedWeightKg,
          receivedWeightKg: b.receivedWeightKg,
          acceptedQty: b.acceptedQty,
          rejectedQty: b.rejectedQty,
          processedQty: b.processedQty,
          documentedRecyclingKg: b.documentedRecyclingKg,
          supportingDocuments: b.supportingDocuments,
          recoveryBreakdown: b.recoveryBreakdown,
          discrepancyFlag: b.discrepancyFlag,
          eprReviewStatus: b.eprReviewStatus,
          isDemoRecord: b.isDemoRecord,
          createdAt: b.createdAt,
          receivedAt: b.receivedAt,
          documentedAt: b.documentedAt,
        },
        timeline: events,
      });
    }

    return NextResponse.json(
      { error: `No traceability record found for code '${normalized}'. Try ECO-2026-1001 or BATCH-2026-PB01.` },
      { status: 404 }
    );
  } catch (err) {
    console.error("Trace lookup error:", err);
    return NextResponse.json(
      { error: "Failed to look up traceability record." },
      { status: 500 }
    );
  }
}
