import { NextResponse } from "next/server";
import { z } from "zod";
import { asc, eq, sql } from "drizzle-orm";
import {
  db,
  pickupRequests,
  traceabilityEvents,
  users,
  collectionCenters,
  recyclingBatches,
  type PickupStatus,
} from "@/db";
import { createNotification, recordAuditLog, requireRole } from "@/lib/auth";
import { VALID_PICKUP_TRANSITIONS } from "@/lib/constants";
import { syncListingsForRequest } from "@/lib/marketplace";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const reqId = Number(id);
    if (!Number.isInteger(reqId)) {
      return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(pickupRequests)
      .where(eq(pickupRequests.id, reqId))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Pickup request not found." }, { status: 404 });
    }

    const record = rows[0];

    // Enforce strict privacy for citizens & organizations
    if (
      (auth.user.role === "citizen" || auth.user.role === "organization") &&
      record.citizenId !== auth.user.id
    ) {
      return NextResponse.json(
        { error: "You do not have access to this private pickup record." },
        { status: 403 }
      );
    }

    if (
      auth.user.role === "partner" &&
      record.assignedPartnerId !== auth.user.id
    ) {
      return NextResponse.json(
        { error: "This pickup is not assigned to you." },
        { status: 403 }
      );
    }

    const [events, center, batch, partner] = await Promise.all([
      db
        .select()
        .from(traceabilityEvents)
        .where(eq(traceabilityEvents.requestId, record.id))
        .orderBy(asc(traceabilityEvents.createdAt)),
      record.collectionCenterId
        ? db
            .select()
            .from(collectionCenters)
            .where(eq(collectionCenters.id, record.collectionCenterId))
            .limit(1)
        : Promise.resolve([]),
      record.batchId
        ? db
            .select()
            .from(recyclingBatches)
            .where(eq(recyclingBatches.id, record.batchId))
            .limit(1)
        : Promise.resolve([]),
      record.assignedPartnerId
        ? db
            .select({
              id: users.id,
              fullName: users.fullName,
              phone: users.phone,
              email: users.email,
            })
            .from(users)
            .where(eq(users.id, record.assignedPartnerId))
            .limit(1)
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      request: {
        ...record,
        collectionCenter: center[0] ?? null,
        batch: batch[0] ?? null,
        assignedPartner: partner[0] ?? null,
      },
      timeline: events,
    });
  } catch (err) {
    console.error("GET pickup detail error:", err);
    return NextResponse.json(
      { error: "Failed to fetch pickup details." },
      { status: 500 }
    );
  }
}

const patchPickupSchema = z.object({
  action: z.enum([
    "review",
    "assign",
    "schedule",
    "record_collection",
    "verify_collection",
    "resolve_discrepancy",
    "cancel",
  ]),
  assignedPartnerId: z.number().int().positive().optional(),
  collectionCenterId: z.number().int().positive().optional(),
  preferredDate: z.string().optional(),
  preferredTimeSlot: z.string().optional(),
  actualCollectedQty: z.number().int().min(1).max(1000).optional(),
  actualCollectedWeightKg: z.number().positive().max(10000).optional(),
  partnerNotes: z.string().max(600).optional(),
  discrepancyReason: z.string().max(600).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const reqId = Number(id);
    if (!Number.isInteger(reqId)) {
      return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parsed = patchPickupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update action." },
        { status: 400 }
      );
    }

    const rows = await db
      .select()
      .from(pickupRequests)
      .where(eq(pickupRequests.id, reqId))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Pickup request not found." }, { status: 404 });
    }

    const current = rows[0];
    const { action } = parsed.data;
    const now = new Date();

    const checkTransition = (nextStatus: PickupStatus) => {
      const allowed = VALID_PICKUP_TRANSITIONS[current.status] || [];
      return allowed.includes(nextStatus);
    };

    if (action === "cancel") {
      const isOwner = current.citizenId === auth.user.id;
      if (!isOwner && auth.user.role !== "admin") {
        return NextResponse.json({ error: "Not authorized to cancel this request." }, { status: 403 });
      }
      if (!checkTransition("cancelled")) {
        return NextResponse.json(
          { error: `Cannot cancel request once in '${current.status}' stage.` },
          { status: 400 }
        );
      }

      const [updated] = await db
        .update(pickupRequests)
        .set({ status: "cancelled", updatedAt: now })
        .where(eq(pickupRequests.id, reqId))
        .returning();
      await syncListingsForRequest(reqId, "cancelled");

      await db.insert(traceabilityEvents).values({
        requestId: reqId,
        stage: "cancelled",
        title: "Pickup Request Cancelled",
        description: `Request cancelled by ${auth.user.fullName} prior to collection.`,
        actorId: auth.user.id,
        actorName: auth.user.fullName,
        actorRole: auth.user.role,
        location: `${current.city}, ${current.state}`,
      });

      await recordAuditLog({
        actor: auth.user,
        action: "PICKUP_CANCELLED",
        entityType: "pickup_request",
        entityId: current.requestCode,
      });

      return NextResponse.json({ request: updated });
    }

    if (action === "review") {
      if (!["admin", "center_manager"].includes(auth.user.role)) {
        return NextResponse.json({ error: "Admin or Center Manager role required." }, { status: 403 });
      }
      if (!checkTransition("reviewed")) {
        return NextResponse.json(
          { error: `Invalid transition from '${current.status}' to 'reviewed'.` },
          { status: 400 }
        );
      }

      const [updated] = await db
        .update(pickupRequests)
        .set({ status: "reviewed", updatedAt: now })
        .where(eq(pickupRequests.id, reqId))
        .returning();

      await db.insert(traceabilityEvents).values({
        requestId: reqId,
        stage: "reviewed",
        title: "Pickup Request Reviewed",
        description: "Operations desk reviewed e-waste manifest and service boundary.",
        actorId: auth.user.id,
        actorName: auth.user.fullName,
        actorRole: auth.user.role,
        location: `${current.city}, ${current.state}`,
      });

      return NextResponse.json({ request: updated });
    }

    if (action === "assign") {
      if (!["admin", "center_manager"].includes(auth.user.role)) {
        return NextResponse.json({ error: "Admin or Center Manager role required." }, { status: 403 });
      }
      if (!parsed.data.assignedPartnerId) {
        return NextResponse.json({ error: "Please select a collection partner." }, { status: 400 });
      }
      if (!checkTransition("assigned") && current.status !== "assigned") {
        return NextResponse.json(
          { error: `Cannot assign partner while request is '${current.status}'.` },
          { status: 400 }
        );
      }

      const [partnerRow] = await db
        .select()
        .from(users)
        .where(eq(users.id, parsed.data.assignedPartnerId))
        .limit(1);
      if (!partnerRow || partnerRow.role !== "partner" || !partnerRow.isActive) return NextResponse.json({ error: "Select an active Collection Partner account." }, { status: 400 });

      const [updated] = await db
        .update(pickupRequests)
        .set({
          status: "assigned",
          assignedPartnerId: parsed.data.assignedPartnerId,
          collectionCenterId: parsed.data.collectionCenterId ?? current.collectionCenterId,
          updatedAt: now,
        })
        .where(eq(pickupRequests.id, reqId))
        .returning();

      await db.insert(traceabilityEvents).values({
        requestId: reqId,
        stage: "assigned",
        title: "Collection Partner Assigned",
        description: `Assigned to ${partnerRow?.fullName || "Collection Partner"} for doorstep pickup.`,
        actorId: auth.user.id,
        actorName: auth.user.fullName,
        actorRole: auth.user.role,
        location: `${current.city}, ${current.state}`,
      });

      await createNotification({
        userId: parsed.data.assignedPartnerId,
        title: `New Pickup Assigned (${current.requestCode})`,
        message: `Assigned pickup in ${current.city}, ${current.state} for ${current.preferredDate} (${current.preferredTimeSlot}).`,
        type: "info",
        relatedUrl: "/dashboard/partner",
      });

      await createNotification({
        userId: current.citizenId,
        title: `Partner Assigned (${current.requestCode})`,
        message: `${partnerRow?.fullName || "A collection partner"} has been assigned to your pickup request.`,
        type: "info",
        relatedUrl: "/dashboard/citizen",
      });

      await recordAuditLog({
        actor: auth.user,
        action: "PICKUP_ASSIGNED",
        entityType: "pickup_request",
        entityId: current.requestCode,
        details: {
          assignedPartnerId: parsed.data.assignedPartnerId,
          collectionCenterId: updated.collectionCenterId,
        },
      });

      return NextResponse.json({ request: updated });
    }

    if (action === "schedule") {
      if (!["admin", "center_manager", "partner"].includes(auth.user.role)) {
        return NextResponse.json({ error: "Not authorized to schedule pickup." }, { status: 403 });
      }
      if (auth.user.role === "partner" && current.assignedPartnerId !== auth.user.id) return NextResponse.json({ error: "This request is not assigned to you." }, { status: 403 });
      if (!checkTransition("scheduled")) {
        return NextResponse.json(
          { error: `Invalid transition from '${current.status}' to 'scheduled'.` },
          { status: 400 }
        );
      }

      const [updated] = await db
        .update(pickupRequests)
        .set({
          status: "scheduled",
          preferredDate: parsed.data.preferredDate || current.preferredDate,
          preferredTimeSlot: parsed.data.preferredTimeSlot || current.preferredTimeSlot,
          updatedAt: now,
        })
        .where(eq(pickupRequests.id, reqId))
        .returning();

      await db.insert(traceabilityEvents).values({
        requestId: reqId,
        stage: "scheduled",
        title: "Collection Window Confirmed",
        description: `Pickup scheduled for ${updated.preferredDate} (${updated.preferredTimeSlot}).`,
        actorId: auth.user.id,
        actorName: auth.user.fullName,
        actorRole: auth.user.role,
        location: `${current.city}, ${current.state}`,
      });

      await createNotification({
        userId: current.citizenId,
        title: `Pickup Scheduled (${current.requestCode})`,
        message: `Confirmed for ${updated.preferredDate} during ${updated.preferredTimeSlot}.`,
        type: "info",
        relatedUrl: "/dashboard/citizen",
      });

      return NextResponse.json({ request: updated });
    }

    if (action === "record_collection") {
      if (!["partner", "admin", "center_manager"].includes(auth.user.role)) {
        return NextResponse.json({ error: "Partner or Admin role required." }, { status: 403 });
      }
      if (
        auth.user.role === "partner" &&
        current.assignedPartnerId !== auth.user.id
      ) {
        return NextResponse.json({ error: "Request not assigned to you." }, { status: 403 });
      }
      if (!checkTransition("collected")) {
        return NextResponse.json(
          { error: `Cannot record physical collection while status is '${current.status}'.` },
          { status: 400 }
        );
      }
      if (
        parsed.data.actualCollectedQty == null ||
        parsed.data.actualCollectedWeightKg == null
      ) {
        return NextResponse.json(
          { error: "Actual collected quantity and measured physical weight (kg) are required." },
          { status: 400 }
        );
      }

      const qtyMismatch = parsed.data.actualCollectedQty !== current.requestedTotalQty;
      const weightVariancePct =
        current.estimatedWeightKg > 0
          ? Math.abs(
              (parsed.data.actualCollectedWeightKg - current.estimatedWeightKg) /
                current.estimatedWeightKg
            ) * 100
          : 0;
      const weightAlert = weightVariancePct > 35;
      const hasDiscrepancy = qtyMismatch || weightAlert;

      const reasonParts: string[] = [];
      if (qtyMismatch) {
        reasonParts.push(
          `Collected qty (${parsed.data.actualCollectedQty}) differs from requested qty (${current.requestedTotalQty}).`
        );
      }
      if (weightAlert) {
        reasonParts.push(
          `Measured physical weight (${parsed.data.actualCollectedWeightKg} kg) differs by ${weightVariancePct.toFixed(1)}% from initial estimate (${current.estimatedWeightKg} kg).`
        );
      }

      const [updated] = await db
        .update(pickupRequests)
        .set({
          status: "collected",
          actualCollectedQty: parsed.data.actualCollectedQty,
          actualCollectedWeightKg: parsed.data.actualCollectedWeightKg,
          partnerNotes: parsed.data.partnerNotes || current.partnerNotes,
          discrepancyFlag: hasDiscrepancy,
          discrepancyReason: hasDiscrepancy ? reasonParts.join(" ") : null,
          collectedAt: now,
          updatedAt: now,
        })
        .where(eq(pickupRequests.id, reqId))
        .returning();
      await syncListingsForRequest(reqId, "collected");

      await db.insert(traceabilityEvents).values({
        requestId: reqId,
        stage: "collected",
        title: "Physical Collection & Actual Weight Recorded",
        description: `Collected ${updated.actualCollectedQty} item(s), measured physical weight ${updated.actualCollectedWeightKg?.toFixed(2)} kg. Material is collected (awaiting center verification & recycling — not yet recycled).`,
        actorId: auth.user.id,
        actorName: auth.user.fullName,
        actorRole: auth.user.role,
        location: `${current.city}, ${current.state}`,
        metadata: {
          actualCollectedQty: updated.actualCollectedQty,
          actualCollectedWeightKg: updated.actualCollectedWeightKg,
          discrepancyFlag: hasDiscrepancy,
        },
      });

      await createNotification({
        userId: current.citizenId,
        title: `E-Waste Collected (${current.requestCode})`,
        message: `Recorded ${updated.actualCollectedQty} item(s) weighing ${updated.actualCollectedWeightKg?.toFixed(2)} kg physically. Awaiting center verification & recycler handover.`,
        type: "success",
        relatedUrl: "/dashboard/citizen",
      });

      await recordAuditLog({
        actor: auth.user,
        action: "COLLECTION_RECORDED",
        entityType: "pickup_request",
        entityId: current.requestCode,
        details: {
          actualCollectedQty: updated.actualCollectedQty,
          actualCollectedWeightKg: updated.actualCollectedWeightKg,
          discrepancyFlag: hasDiscrepancy,
        },
      });

      return NextResponse.json({ request: updated });
    }

    if (action === "verify_collection") {
      if (!["admin", "center_manager"].includes(auth.user.role)) {
        return NextResponse.json({ error: "Admin or Center Manager role required." }, { status: 403 });
      }
      if (!checkTransition("verified")) {
        return NextResponse.json(
          { error: `Only 'collected' requests can be verified (current: '${current.status}').` },
          { status: 400 }
        );
      }

      const [updated] = await db
        .update(pickupRequests)
        .set({
          status: "verified",
          verifiedAt: now,
          updatedAt: now,
        })
        .where(eq(pickupRequests.id, reqId))
        .returning();
      await syncListingsForRequest(reqId, "verified");

      // Award Green Points to citizen upon verified physical collection (10 pts per kg + 15 base)
      const earnedPoints = Math.max(
        15,
        Math.round((updated.actualCollectedWeightKg || 1) * 10 + 15)
      );
      await db
        .update(users)
        .set({ greenPoints: sql`${users.greenPoints} + ${earnedPoints}` })
        .where(eq(users.id, current.citizenId));

      // Increment collection center load
      if (updated.collectionCenterId && updated.actualCollectedWeightKg) {
        await db
          .update(collectionCenters)
          .set({
            currentLoadKg: sql`${collectionCenters.currentLoadKg} + ${updated.actualCollectedWeightKg}`,
          })
          .where(eq(collectionCenters.id, updated.collectionCenterId));
      }

      await db.insert(traceabilityEvents).values({
        requestId: reqId,
        stage: "verified",
        title: "Collection Verified at Hub",
        description: `Actual collected weight (${updated.actualCollectedWeightKg?.toFixed(2)} kg) verified at collection center. Ready for recycling batch consolidation.`,
        actorId: auth.user.id,
        actorName: auth.user.fullName,
        actorRole: auth.user.role,
        location: `${current.city}, ${current.state}`,
      });

      await createNotification({
        userId: current.citizenId,
        title: `Collection Verified (+${earnedPoints} Green Points)`,
        message: `Request ${current.requestCode} (${updated.actualCollectedWeightKg?.toFixed(2)} kg) has been verified at the collection hub.`,
        type: "success",
        relatedUrl: "/dashboard/citizen",
      });

      await recordAuditLog({
        actor: auth.user,
        action: "COLLECTION_VERIFIED",
        entityType: "pickup_request",
        entityId: current.requestCode,
        details: {
          actualCollectedWeightKg: updated.actualCollectedWeightKg,
          earnedPoints,
        },
      });

      return NextResponse.json({ request: updated });
    }

    if (action === "resolve_discrepancy") {
      if (auth.user.role !== "admin") {
        return NextResponse.json({ error: "Admin role required." }, { status: 403 });
      }
      const [updated] = await db
        .update(pickupRequests)
        .set({
          discrepancyFlag: false,
          discrepancyReason: parsed.data.discrepancyReason
            ? `Resolved by admin: ${parsed.data.discrepancyReason}`
            : "Reviewed and cleared by administrator.",
          updatedAt: now,
        })
        .where(eq(pickupRequests.id, reqId))
        .returning();

      await recordAuditLog({
        actor: auth.user,
        action: "DISCREPANCY_RESOLVED",
        entityType: "pickup_request",
        entityId: current.requestCode,
        details: { notes: parsed.data.discrepancyReason },
      });

      return NextResponse.json({ request: updated });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (err) {
    console.error("PATCH pickup error:", err);
    return NextResponse.json(
      { error: "Failed to update pickup request." },
      { status: 500 }
    );
  }
}
