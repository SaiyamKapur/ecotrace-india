import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  db,
  recyclingBatches,
  pickupRequests,
  traceabilityEvents,
  eprRecords,
  users,
} from "@/db";
import { createNotification, recordAuditLog, requireRole } from "@/lib/auth";
import { syncListingsForRequest } from "@/lib/marketplace";

const batchPatchSchema = z.object({
  action: z.enum([
    "confirm_receipt",
    "start_processing",
    "document_processing",
    "add_document",
    "resolve_discrepancy",
  ]),
  receivedWeightKg: z.number().positive().max(50000).optional(),
  acceptedQty: z.number().int().min(0).max(5000).optional(),
  rejectedQty: z.number().int().min(0).max(5000).optional(),
  processedQty: z.number().int().min(0).max(5000).optional(),
  documentedRecyclingKg: z.number().min(0).max(50000).optional(),
  processingNotes: z.string().max(800).optional(),
  discrepancyNotes: z.string().max(800).optional(),
  recoveryBreakdown: z
    .object({
      metalsKg: z.number().min(0),
      plasticsKg: z.number().min(0),
      glassKg: z.number().min(0),
      circuitBoardsKg: z.number().min(0),
      hazardousDivertedKg: z.number().min(0),
    })
    .optional(),
  document: z
    .object({
      title: z.string().trim().min(2).max(200),
      docType: z.string().trim().min(2).max(100),
      referenceNo: z.string().trim().min(2).max(100),
      fileName: z.string().trim().min(2).max(200),
      notes: z.string().max(400).optional(),
    })
    .optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(["recycler", "admin"]);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const batchId = Number(id);
    if (!Number.isInteger(batchId)) {
      return NextResponse.json({ error: "Invalid batch ID." }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parsed = batchPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid batch update." },
        { status: 400 }
      );
    }

    const rows = await db
      .select()
      .from(recyclingBatches)
      .where(eq(recyclingBatches.id, batchId))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Batch not found." }, { status: 404 });
    }

    const batch = rows[0];
    const linkedRequests = await db
      .select()
      .from(pickupRequests)
      .where(eq(pickupRequests.batchId, batch.id));

    const now = new Date();
    const { action } = parsed.data;

    if (action === "confirm_receipt") {
      if (!["created", "dispatched"].includes(batch.status)) return NextResponse.json({ error: "Only incoming dispatched batches may be received. A receipt cannot be recorded twice." }, { status: 409 });
      if (
        parsed.data.receivedWeightKg == null ||
        parsed.data.acceptedQty == null
      ) {
        return NextResponse.json(
          { error: "Received weight (kg) and accepted quantity are required." },
          { status: 400 }
        );
      }

      const rejectedQty = parsed.data.rejectedQty ?? 0;
      const variancePct =
        batch.dispatchedWeightKg > 0
          ? ((parsed.data.receivedWeightKg - batch.dispatchedWeightKg) /
              batch.dispatchedWeightKg) *
            100
          : 0;
      const weightDiscrepancy = Math.abs(variancePct) > 10;
      const qtyDiscrepancy =
        parsed.data.acceptedQty + rejectedQty !== batch.dispatchedQty ||
        rejectedQty > 0;
      const flagged = weightDiscrepancy || qtyDiscrepancy;

      const reasons: string[] = [];
      if (weightDiscrepancy) {
        reasons.push(
          `Gate weight (${parsed.data.receivedWeightKg.toFixed(2)} kg) varies by ${variancePct.toFixed(1)}% vs dispatched (${batch.dispatchedWeightKg.toFixed(2)} kg).`
        );
      }
      if (qtyDiscrepancy) {
        reasons.push(
          `Accepted (${parsed.data.acceptedQty}) + Rejected (${rejectedQty}) vs Dispatched (${batch.dispatchedQty}).`
        );
      }

      const nextStatus = flagged ? "discrepancy_review" : "received";

      const [updated] = await db
        .update(recyclingBatches)
        .set({
          status: nextStatus,
          receivedWeightKg: parsed.data.receivedWeightKg,
          acceptedQty: parsed.data.acceptedQty,
          rejectedQty,
          discrepancyFlag: flagged,
          discrepancyNotes: flagged
            ? parsed.data.discrepancyNotes || reasons.join(" ")
            : null,
          processingNotes: parsed.data.processingNotes || batch.processingNotes,
          receivedAt: now,
          updatedAt: now,
        })
        .where(eq(recyclingBatches.id, batch.id))
        .returning();

      await db
        .update(pickupRequests)
        .set({
          status: "received_by_recycler",
          discrepancyFlag: flagged ? true : undefined,
          discrepancyReason: flagged
            ? `Batch ${batch.batchCode}: ${reasons.join(" ")}`
            : undefined,
          updatedAt: now,
        })
        .where(eq(pickupRequests.batchId, batch.id));

      for (const r of linkedRequests) {
        await syncListingsForRequest(r.id, "received_by_recycler");
        await db.insert(traceabilityEvents).values({
          requestId: r.id,
          batchId: batch.id,
          stage: "received_by_recycler",
          title: `Recycler Confirmed Receipt (${batch.batchCode})`,
          description: `Gate weighbridge logged ${parsed.data.receivedWeightKg.toFixed(2)} kg (${parsed.data.acceptedQty} accepted, ${rejectedQty} rejected).${flagged ? " Discrepancy flagged for human review." : ""}`,
          actorId: auth.user.id,
          actorName: auth.user.fullName,
          actorRole: auth.user.role,
          location: "Recycler Facility",
        });

        await createNotification({
          userId: r.citizenId,
          title: `Batch Received by Recycler (${r.requestCode})`,
          message: `Recycler confirmed physical receipt of batch ${batch.batchCode} (${parsed.data.receivedWeightKg.toFixed(2)} kg gate weight).`,
          type: "info",
          relatedUrl: "/dashboard/citizen",
        });
      }

      if (flagged) {
        const admins = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.role, "admin"));
        for (const adm of admins) {
          await createNotification({
            userId: adm.id,
            title: `Discrepancy Alert: ${batch.batchCode}`,
            message: reasons.join(" "),
            type: "alert",
            relatedUrl: "/dashboard/admin",
          });
        }
      }

      await recordAuditLog({
        actor: auth.user,
        action: flagged ? "BATCH_RECEIPT_DISCREPANCY" : "BATCH_RECEIVED",
        entityType: "recycling_batch",
        entityId: batch.batchCode,
        details: {
          dispatchedWeightKg: batch.dispatchedWeightKg,
          receivedWeightKg: parsed.data.receivedWeightKg,
          acceptedQty: parsed.data.acceptedQty,
          rejectedQty,
          variancePct: Number(variancePct.toFixed(2)),
        },
      });

      return NextResponse.json({ batch: updated });
    }

    if (action === "start_processing") {
      if (batch.status !== "received" || batch.discrepancyFlag) return NextResponse.json({ error: "Only received, discrepancy-free batches can enter processing. Ask an admin to resolve any flagged variance." }, { status: 409 });
      const [updated] = await db
        .update(recyclingBatches)
        .set({
          status: "processing",
          processingNotes: parsed.data.processingNotes || batch.processingNotes,
          processedAt: now,
          updatedAt: now,
        })
        .where(eq(recyclingBatches.id, batch.id))
        .returning();

      await db
        .update(pickupRequests)
        .set({ status: "processing", updatedAt: now })
        .where(eq(pickupRequests.batchId, batch.id));

      for (const r of linkedRequests) {
        await syncListingsForRequest(r.id, "processing");
        await db.insert(traceabilityEvents).values({
          requestId: r.id,
          batchId: batch.id,
          stage: "processing",
          title: `Dismantling & Material Recovery In Progress`,
          description:
            parsed.data.processingNotes ||
            `Batch ${batch.batchCode} entered active dismantling, hazardous isolation, and material sorting.`,
          actorId: auth.user.id,
          actorName: auth.user.fullName,
          actorRole: auth.user.role,
          location: "Recycler Facility",
        });
      }

      await recordAuditLog({
        actor: auth.user,
        action: "BATCH_PROCESSING_STARTED",
        entityType: "recycling_batch",
        entityId: batch.batchCode,
      });

      return NextResponse.json({ batch: updated });
    }

    if (action === "add_document") {
      if (!parsed.data.document) {
        return NextResponse.json(
          { error: "Document details are required." },
          { status: 400 }
        );
      }

      const nextDocs = [
        ...(batch.supportingDocuments || []),
        {
          id: `doc-${Date.now()}`,
          ...parsed.data.document,
          uploadedBy: auth.user.fullName,
          uploadedAt: now.toISOString(),
        },
      ];

      const [updated] = await db
        .update(recyclingBatches)
        .set({
          supportingDocuments: nextDocs,
          updatedAt: now,
        })
        .where(eq(recyclingBatches.id, batch.id))
        .returning();

      await recordAuditLog({
        actor: auth.user,
        action: "BATCH_DOCUMENT_UPLOADED",
        entityType: "recycling_batch",
        entityId: batch.batchCode,
        details: { docTitle: parsed.data.document.title },
      });

      return NextResponse.json({ batch: updated });
    }

    if (action === "document_processing") {
      if (batch.status !== "processing" || batch.discrepancyFlag) return NextResponse.json({ error: "Only an active, discrepancy-free processing batch can be documented." }, { status: 409 });
      if (!parsed.data.document && (batch.supportingDocuments || []).length === 0) return NextResponse.json({ error: "Attach at least one supporting processing document before completion." }, { status: 400 });
      if (parsed.data.processedQty != null && parsed.data.processedQty > (batch.acceptedQty ?? batch.dispatchedQty)) return NextResponse.json({ error: "Processed quantity cannot exceed accepted units." }, { status: 400 });
      if (parsed.data.documentedRecyclingKg != null && parsed.data.documentedRecyclingKg > (batch.receivedWeightKg ?? 0)) return NextResponse.json({ error: "Documented recycled weight cannot exceed the measured recycler receipt." }, { status: 400 });
      if (parsed.data.recoveryBreakdown && parsed.data.documentedRecyclingKg != null) {
        const recovered = parsed.data.recoveryBreakdown.metalsKg + parsed.data.recoveryBreakdown.plasticsKg + parsed.data.recoveryBreakdown.glassKg + parsed.data.recoveryBreakdown.circuitBoardsKg;
        if (recovered > parsed.data.documentedRecyclingKg + 0.01) return NextResponse.json({ error: "Reported recovered materials cannot exceed documented recycled weight." }, { status: 400 });
      }
      if (
        parsed.data.processedQty == null ||
        parsed.data.documentedRecyclingKg == null
      ) {
        return NextResponse.json(
          { error: "Processed quantity and documented recycling weight (kg) are required." },
          { status: 400 }
        );
      }

      const nextDocs = parsed.data.document
        ? [
            ...(batch.supportingDocuments || []),
            {
              id: `doc-${Date.now()}`,
              ...parsed.data.document,
              uploadedBy: auth.user.fullName,
              uploadedAt: now.toISOString(),
            },
          ]
        : batch.supportingDocuments || [];

      const [updated] = await db
        .update(recyclingBatches)
        .set({
          status: "documented",
          processedQty: parsed.data.processedQty,
          documentedRecyclingKg: parsed.data.documentedRecyclingKg,
          recoveryBreakdown: parsed.data.recoveryBreakdown ?? batch.recoveryBreakdown,
          supportingDocuments: nextDocs,
          processingNotes: parsed.data.processingNotes || batch.processingNotes,
          eprReviewStatus: "documented_non_statutory",
          documentedAt: now,
          updatedAt: now,
        })
        .where(eq(recyclingBatches.id, batch.id))
        .returning();

      await db
        .update(pickupRequests)
        .set({ status: "documented", updatedAt: now })
        .where(eq(pickupRequests.batchId, batch.id));

      // Create internal traceability EPR record (explicitly non-statutory!)
      const totalRequestedQty = linkedRequests.reduce(
        (s, r) => s + r.requestedTotalQty,
        0
      );
      const totalEstWeight = Number(
        linkedRequests.reduce((s, r) => s + r.estimatedWeightKg, 0).toFixed(2)
      );

      await db.insert(eprRecords).values({
        recordCode: `EPR-TRACE-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        batchId: batch.id,
        reportingPeriod: "FY 2025-26",
        category: "Documented Batch Recovery",
        requestedQty: totalRequestedQty || batch.dispatchedQty,
        estimatedWeightKg: totalEstWeight || batch.dispatchedWeightKg,
        actualCollectedWeightKg: batch.dispatchedWeightKg,
        recyclerReceivedWeightKg: batch.receivedWeightKg ?? batch.dispatchedWeightKg,
        processedQty: parsed.data.processedQty,
        documentedRecyclingKg: parsed.data.documentedRecyclingKg,
        supportingDocsCount: nextDocs.length,
        verificationStatus: "draft_record",
        notes:
          "Internal traceability summary created upon recycler processing documentation. Does NOT automatically constitute a statutory CPCB EPR credit certificate.",
      });

      for (const r of linkedRequests) {
        await syncListingsForRequest(r.id, "documented");
        await db.insert(traceabilityEvents).values({
          requestId: r.id,
          batchId: batch.id,
          stage: "documented",
          title: `Recycling Processing Documented (${batch.batchCode})`,
          description: `Processed ${parsed.data.processedQty} units with ${parsed.data.documentedRecyclingKg.toFixed(2)} kg documented recovery & ${nextDocs.length} supporting document(s).`,
          actorId: auth.user.id,
          actorName: auth.user.fullName,
          actorRole: auth.user.role,
          location: "Recycler Facility",
        });

        await createNotification({
          userId: r.citizenId,
          title: `Recycling Documentation Complete (${r.requestCode})`,
          message: `Your e-waste in batch ${batch.batchCode} has completed recycling with ${parsed.data.documentedRecyclingKg.toFixed(2)} kg documented recovery.`,
          type: "success",
          relatedUrl: "/dashboard/citizen",
        });
      }

      await recordAuditLog({
        actor: auth.user,
        action: "BATCH_DOCUMENTED",
        entityType: "recycling_batch",
        entityId: batch.batchCode,
        details: {
          processedQty: parsed.data.processedQty,
          documentedRecyclingKg: parsed.data.documentedRecyclingKg,
          docsCount: nextDocs.length,
        },
      });

      return NextResponse.json({ batch: updated });
    }

    if (action === "resolve_discrepancy") {
      if (auth.user.role !== "admin") {
        return NextResponse.json({ error: "Admin role required." }, { status: 403 });
      }
      const [updated] = await db
        .update(recyclingBatches)
        .set({
          discrepancyFlag: false,
          status: batch.status === "discrepancy_review" ? "received" : batch.status,
          discrepancyNotes: parsed.data.discrepancyNotes
            ? `Admin cleared: ${parsed.data.discrepancyNotes}`
            : "Discrepancy reviewed and cleared by administrator.",
          updatedAt: now,
        })
        .where(eq(recyclingBatches.id, batch.id))
        .returning();

      await recordAuditLog({
        actor: auth.user,
        action: "BATCH_DISCREPANCY_RESOLVED",
        entityType: "recycling_batch",
        entityId: batch.batchCode,
        details: { notes: parsed.data.discrepancyNotes },
      });

      return NextResponse.json({ batch: updated });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (err) {
    console.error("PATCH batch error:", err);
    return NextResponse.json(
      { error: "Failed to update batch." },
      { status: 500 }
    );
  }
}
