import React from "react";
import { asc, eq } from "drizzle-orm";
import { db, productListings, pickupRequests, recyclingBatches, settlementRecords, traceabilityEvents } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { TabletJourneyClient } from "@/components/tablet-journey-client";

export const dynamic = "force-dynamic";

export default async function TabletJourneyPage() {
  await ensureSeeded();
  const [listing] = await db.select().from(productListings).where(eq(productListings.listingCode, "LIST-PGW-TABLET-01")).limit(1);
  if (!listing || !listing.isDemoRecord || !listing.requestId) return <main className="grid min-h-screen place-items-center text-sm text-slate-600">Sample tablet journey is being prepared. Please refresh shortly.</main>;
  const [pickup] = await db.select().from(pickupRequests).where(eq(pickupRequests.id, listing.requestId)).limit(1);
  if (!pickup || !pickup.isDemoRecord) return <main className="grid min-h-screen place-items-center text-sm text-slate-600">Sample pickup record is being prepared.</main>;
  const [[batch], [settlement], events] = await Promise.all([
    pickup.batchId ? db.select().from(recyclingBatches).where(eq(recyclingBatches.id, pickup.batchId)).limit(1) : Promise.resolve([]),
    db.select().from(settlementRecords).where(eq(settlementRecords.listingId, listing.id)).limit(1),
    db.select({ id: traceabilityEvents.id, stage: traceabilityEvents.stage, title: traceabilityEvents.title, description: traceabilityEvents.description, location: traceabilityEvents.location, actorRole: traceabilityEvents.actorRole, createdAt: traceabilityEvents.createdAt }).from(traceabilityEvents).where(eq(traceabilityEvents.requestId, pickup.id)).orderBy(asc(traceabilityEvents.createdAt)),
  ]);
  const record = {
    listing: { id: listing.id, listingCode: listing.listingCode, title: listing.title, category: listing.category, condition: listing.condition, quantity: listing.quantity, imageUrl: listing.imageUrl, indicativeValuePaise: listing.indicativeValuePaise, offeredAmountPaise: listing.offeredAmountPaise },
    pickup: { requestCode: pickup.requestCode, city: pickup.city, state: pickup.state, status: pickup.status, estimatedWeightKg: pickup.estimatedWeightKg, actualCollectedQty: pickup.actualCollectedQty, actualCollectedWeightKg: pickup.actualCollectedWeightKg, collectedAt: pickup.collectedAt?.toISOString() ?? null },
    batch: batch ? { batchCode: batch.batchCode, dispatchedWeightKg: batch.dispatchedWeightKg, receivedWeightKg: batch.receivedWeightKg, documentedRecyclingKg: batch.documentedRecyclingKg, processedQty: batch.processedQty, documents: batch.supportingDocuments.map((doc) => ({ title: doc.title, referenceNo: doc.referenceNo, docType: doc.docType })) } : null,
    settlement: settlement ? { id: settlement.id, statementCode: settlement.statementCode, status: settlement.status, finalAmountPaise: settlement.finalAmountPaise, creditedAt: settlement.creditedAt?.toISOString() ?? null } : null,
    events: events.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
  };
  return <TabletJourneyClient record={record} />;
}
