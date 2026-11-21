import { eq } from "drizzle-orm";
import {
  db, users, collectionCenters, recyclingBatches, pickupRequests, productListings,
  settlementRecords, traceabilityEvents, eprRecords, auditLogs,
} from "@/db";
import { indicativeValuePaise } from "@/lib/constants";

const ago = (days: number) => new Date(Date.now() - days * 86_400_000);
const SAMPLE_PICKUP_CODE = "ECO-2026-TABLET-01";
const SAMPLE_BATCH_CODE = "BATCH-2026-PGW-TABLET";
const SAMPLE_LISTING_CODE = "LIST-PGW-TABLET-01";
const SAMPLE_STATEMENT_CODE = "STMT-PGW-TABLET-01";

export async function seedTabletJourney() {
  const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.email, "phagwara.customer@ecotrace.demo")).limit(1);
  const [partner] = await db.select({ id: users.id }).from(users).where(eq(users.email, "partner@ecotrace.demo")).limit(1);
  const [recycler] = await db.select({ id: users.id }).from(users).where(eq(users.email, "recycler@ecotrace.demo")).limit(1);
  const [manager] = await db.select({ id: users.id }).from(users).where(eq(users.email, "center@ecotrace.demo")).limit(1);
  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.email, "admin@ecotrace.demo")).limit(1);
  const [center] = await db.select({ id: collectionCenters.id }).from(collectionCenters).where(eq(collectionCenters.code, "PB-PGW-DEMO-09")).limit(1);
  if (!owner || !partner || !recycler || !manager || !admin || !center) return;

  await db.insert(recyclingBatches).values({
    batchCode: SAMPLE_BATCH_CODE,
    collectionCenterId: center.id,
    recyclerId: recycler.id,
    status: "documented",
    dispatchedQty: 1,
    dispatchedWeightKg: 0.58,
    receivedWeightKg: 0.56,
    acceptedQty: 1,
    rejectedQty: 0,
    processedQty: 1,
    documentedRecyclingKg: 0.53,
    recoveryBreakdown: { metalsKg: 0.12, plasticsKg: 0.14, glassKg: 0.19, circuitBoardsKg: 0.08, hazardousDivertedKg: 0.02 },
    supportingDocuments: [{
      id: "tablet-recovery-sample-01",
      title: "Sample tablet processing log",
      docType: "Internal processing record",
      referenceNo: "REC-PGW-2026-TABLET-01",
      fileName: "tablet-recovery-log-sample.pdf",
      uploadedBy: "Recycler sample operator",
      uploadedAt: ago(2).toISOString(),
      notes: "Illustrative internal record, not a statutory certificate.",
    }],
    eprReviewStatus: "documented_non_statutory",
    processingNotes: "Sample dismantling: battery isolated, glass and metals segregated, PCB sent to recovery stream.",
    isDemoRecord: true,
    createdAt: ago(5),
    receivedAt: ago(4),
    processedAt: ago(3),
    documentedAt: ago(2),
    updatedAt: ago(2),
  }).onConflictDoNothing();
  const [batch] = await db.select().from(recyclingBatches).where(eq(recyclingBatches.batchCode, SAMPLE_BATCH_CODE)).limit(1);
  if (!batch) return;

  await db.insert(pickupRequests).values({
    requestCode: SAMPLE_PICKUP_CODE,
    citizenId: owner.id,
    assignedPartnerId: partner.id,
    collectionCenterId: center.id,
    batchId: batch.id,
    status: "documented",
    items: [{ category: "Tablets", quantity: 1, estimatedUnitWeightKg: 0.52, estimatedTotalWeightKg: 0.52, userCorrected: true, notes: "Customer confirmed category from the sample photo." }],
    requestedTotalQty: 1,
    estimatedWeightKg: 0.52,
    actualCollectedQty: 1,
    actualCollectedWeightKg: 0.58,
    aiClassificationMode: "manual",
    pickupAddress: "Phagwara commercial area (illustrative sample, not a home address)",
    city: "Phagwara", state: "Punjab", pincode: "144401",
    preferredDate: ago(7).toISOString().slice(0, 10),
    preferredTimeSlot: "09:00 AM - 12:00 PM",
    citizenNotes: "Sample tablet journey for educational walkthrough; photo credited to Pexels.",
    partnerNotes: "Sample physical collection: 1 tablet; measured 0.58 kg.",
    discrepancyFlag: false,
    isDemoRecord: true,
    createdAt: ago(8),
    updatedAt: ago(2),
    collectedAt: ago(6),
    verifiedAt: ago(5),
  }).onConflictDoNothing();
  const [pickup] = await db.select().from(pickupRequests).where(eq(pickupRequests.requestCode, SAMPLE_PICKUP_CODE)).limit(1);
  if (!pickup) return;

  await db.insert(productListings).values({
    listingCode: SAMPLE_LISTING_CODE,
    ownerId: owner.id,
    requestId: pickup.id,
    title: "Pre-loved tablet · Phagwara",
    brand: "Assorted", model: "10-inch touchscreen tablet",
    category: "Tablets", condition: "repairable", quantity: 1,
    imageUrl: "/images/tablet-sample.jpg",
    description: "Stock photograph illustrates one tablet. This is a sample product journey; no real customer's device or private address is represented.",
    city: "Phagwara", state: "Punjab",
    indicativeValuePaise: indicativeValuePaise("Tablets", "repairable", 1),
    offeredAmountPaise: 75000,
    quoteNotes: "Sample administrator-reviewed offer: ₹750 for one tablet, subject to confirmed collection.",
    status: "paid",
    isDemoRecord: true,
    createdAt: ago(9), quotedAt: ago(8), acceptedAt: ago(8), updatedAt: ago(1),
  }).onConflictDoNothing();
  const [listing] = await db.select().from(productListings).where(eq(productListings.listingCode, SAMPLE_LISTING_CODE)).limit(1);
  if (!listing) return;

  await db.insert(settlementRecords).values({
    statementCode: SAMPLE_STATEMENT_CODE,
    listingId: listing.id,
    ownerId: owner.id,
    requestId: pickup.id,
    quotedAmountPaise: 75000,
    finalAmountPaise: 75000,
    status: "credited",
    method: "demo_wallet",
    payoutReference: "SAMPLE-WALLET-PGW-TABLET-01",
    adjustmentReason: "1 of 1 listed tablet physically collected and verified. No quantity adjustment.",
    notes: "Sample wallet credit only; no funds or bank transfer took place.",
    isDemoRecord: true,
    createdAt: ago(2), approvedAt: ago(1), creditedAt: ago(1), updatedAt: ago(1),
  }).onConflictDoNothing();

  await db.insert(eprRecords).values({
    recordCode: "EPR-TRACE-PGW-TABLET-01",
    batchId: batch.id,
    reportingPeriod: "FY 2026-27 Q3 (sample)",
    category: "Tablet equipment",
    requestedQty: 1, estimatedWeightKg: 0.52, actualCollectedWeightKg: 0.58,
    recyclerReceivedWeightKg: 0.56, processedQty: 1, documentedRecyclingKg: 0.53,
    supportingDocsCount: 1, verificationStatus: "verified_internal",
    notes: "Internal sample traceability. Does not establish a statutory EPR credit.",
    createdAt: ago(2), updatedAt: ago(1),
  }).onConflictDoNothing();

  const existingEvents = await db.select({ id: traceabilityEvents.id }).from(traceabilityEvents).where(eq(traceabilityEvents.requestId, pickup.id)).limit(1);
  if (!existingEvents.length) {
    const steps = [
      { stage: "listed", title: "Tablet photographed and listed", description: "Customer listed one repairable tablet with a licensed stock sample photo and indicative value ₹650.", days: 9, actor: owner.id, role: "citizen" },
      { stage: "quoted", title: "Offer reviewed by operations", description: "Administrator recorded a sample offer of ₹750. This is not a guaranteed market price.", days: 8.5, actor: admin.id, role: "admin" },
      { stage: "accepted", title: "Customer accepted offer", description: "The owner accepted the reviewed sample offer and linked the tablet to a pickup request.", days: 8, actor: owner.id, role: "citizen" },
      { stage: "submitted", title: "Pickup request submitted", description: "One tablet requested in Phagwara; category-average weight estimated at ~0.52 kg.", days: 7.9, actor: owner.id, role: "citizen" },
      { stage: "assigned", title: "Collection partner assigned", description: "Operations assigned the sample collection route to a partner.", days: 7.5, actor: admin.id, role: "admin" },
      { stage: "scheduled", title: "Pickup time confirmed", description: "A morning sample collection slot was confirmed.", days: 7, actor: partner.id, role: "partner" },
      { stage: "collected", title: "Tablet physically collected and weighed", description: "Physical sample collection confirmed 1 item at 0.58 kg, separate from the image estimate.", days: 6, actor: partner.id, role: "partner" },
      { stage: "verified", title: "Phagwara hub verified collection", description: "Hub recorded the sample collected quantity and measured weight; material is not yet recycled.", days: 5, actor: manager.id, role: "center_manager" },
      { stage: "batched", title: "Material added to recycler batch", description: "One verified tablet dispatched from the Phagwara sample hub weighing 0.58 kg.", days: 4.8, actor: manager.id, role: "center_manager" },
      { stage: "received_by_recycler", title: "Recycler confirmed gate receipt", description: "Recycler independently recorded 0.56 kg received, with 1 accepted item and no rejection.", days: 4, actor: recycler.id, role: "recycler" },
      { stage: "processing", title: "Battery isolated; materials separated", description: "Glass, plastics, metals and electronics were itemized in an internal sample processing record.", days: 3, actor: recycler.id, role: "recycler" },
      { stage: "documented", title: "Recycling processing documented", description: "Recycler logged 0.53 kg of documented recovered material with one supporting sample record.", days: 2, actor: recycler.id, role: "recycler" },
      { stage: "wallet_credited", title: "Sample wallet marked credited", description: "After documented processing, an administrator approved a ₹750 sample wallet credit. No real payment occurred.", days: 1, actor: admin.id, role: "admin" },
    ];
    await db.insert(traceabilityEvents).values(steps.map((step) => ({
      requestId: pickup.id, batchId: batch.id, stage: step.stage, title: step.title,
      description: step.description, actorId: step.actor, actorRole: step.role,
      actorName: step.role === "citizen" ? "Sample customer" : step.role === "admin" ? "Operations" : step.role === "partner" ? "Collection partner" : step.role === "center_manager" ? "Hub manager" : "Recycler",
      location: "Phagwara, Punjab (sample)", metadata: { sample: true }, createdAt: ago(step.days),
    })));
  }

  const audit = await db.select({ id: auditLogs.id }).from(auditLogs).where(eq(auditLogs.entityId, SAMPLE_STATEMENT_CODE)).limit(1);
  if (!audit.length) await db.insert(auditLogs).values({
    actorId: admin.id, actorEmail: "admin@ecotrace.demo", actorRole: "admin",
    action: "SAMPLE_WALLET_CREDITED", entityType: "settlement", entityId: SAMPLE_STATEMENT_CODE,
    details: { amountPaise: 75000, realMoney: false, sample: true }, createdAt: ago(1),
  });
}
