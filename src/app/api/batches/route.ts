import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";
import {
  db,
  recyclingBatches,
  pickupRequests,
  collectionCenters,
  users,
  traceabilityEvents,
} from "@/db";
import { createNotification, recordAuditLog, requireRole } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { syncListingsForRequest } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const auth = await requireRole([
      "recycler",
      "admin",
      "center_manager",
      "organization",
    ]);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [batches, allCenters, allUsers, allRequests] = await Promise.all([
      db
        .select()
        .from(recyclingBatches)
        .orderBy(desc(recyclingBatches.createdAt)),
      db.select().from(collectionCenters),
      db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          organizationName: users.organizationName,
          role: users.role,
        })
        .from(users),
      db.select().from(pickupRequests),
    ]);

    const centerMap = new Map(allCenters.map((c) => [c.id, c]));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const filteredBatches =
      auth.user.role === "recycler"
        ? batches.filter((b) => !b.recyclerId || b.recyclerId === auth.user.id)
        : batches;

    const enriched = filteredBatches.map((b) => {
      const linkedRequests = allRequests.filter((r) => r.batchId === b.id);
      return {
        ...b,
        collectionCenter: b.collectionCenterId
          ? centerMap.get(b.collectionCenterId) ?? null
          : null,
        recycler: b.recyclerId ? userMap.get(b.recyclerId) ?? null : null,
        linkedRequests: linkedRequests.map((r) => ({
          id: r.id,
          requestCode: r.requestCode,
          status: r.status,
          city: r.city,
          state: r.state,
          requestedTotalQty: r.requestedTotalQty,
          actualCollectedQty: r.actualCollectedQty,
          estimatedWeightKg: r.estimatedWeightKg,
          actualCollectedWeightKg: r.actualCollectedWeightKg,
          items: r.items,
        })),
      };
    });

    return NextResponse.json({ batches: enriched });
  } catch (err) {
    console.error("GET batches error:", err);
    return NextResponse.json(
      { error: "Failed to fetch recycling batches." },
      { status: 500 }
    );
  }
}

const createBatchSchema = z.object({
  requestIds: z
    .array(z.number().int().positive())
    .min(1, "Select at least one verified pickup request."),
  collectionCenterId: z.number().int().positive().nullable().optional(),
  recyclerId: z.number().int().positive().nullable().optional(),
  processingNotes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const auth = await requireRole(["admin", "center_manager"]);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = createBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid batch request." },
        { status: 400 }
      );
    }

    const selectedRequests = await db
      .select()
      .from(pickupRequests)
      .where(inArray(pickupRequests.id, parsed.data.requestIds));

    if (selectedRequests.length === 0) {
      return NextResponse.json(
        { error: "No matching pickup requests found." },
        { status: 404 }
      );
    }

    const nonVerified = selectedRequests.filter((r) => r.status !== "verified");
    if (nonVerified.length > 0) {
      return NextResponse.json(
        {
          error: `Only verified collections can be batched. Non-verified: ${nonVerified.map((r) => r.requestCode).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Default to demo recycler if unspecified
    let recyclerId = parsed.data.recyclerId ?? null;
    if (!recyclerId) {
      const recyclers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "recycler"))
        .limit(1);
      recyclerId = recyclers[0]?.id ?? null;
    }

    const dispatchedQty = selectedRequests.reduce(
      (sum, r) => sum + (r.actualCollectedQty ?? r.requestedTotalQty),
      0
    );
    const dispatchedWeightKg = Number(
      selectedRequests
        .reduce((sum, r) => sum + (r.actualCollectedWeightKg ?? 0), 0)
        .toFixed(2)
    );

    const centerId =
      parsed.data.collectionCenterId ??
      selectedRequests[0].collectionCenterId ??
      null;

    const batchCode = `BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const [createdBatch] = await db
      .insert(recyclingBatches)
      .values({
        batchCode,
        collectionCenterId: centerId,
        recyclerId,
        status: "dispatched",
        dispatchedQty,
        dispatchedWeightKg,
        processingNotes:
          parsed.data.processingNotes ||
          "Dispatched from collection hub to recycler facility.",
        isDemoRecord: false,
      })
      .returning();

    const now = new Date();
    await db
      .update(pickupRequests)
      .set({
        status: "batched",
        batchId: createdBatch.id,
        updatedAt: now,
      })
      .where(inArray(pickupRequests.id, parsed.data.requestIds));

    for (const r of selectedRequests) {
      await syncListingsForRequest(r.id, "batched");
      await db.insert(traceabilityEvents).values({
        requestId: r.id,
        batchId: createdBatch.id,
        stage: "batched",
        title: `Assigned to Recycling Batch ${createdBatch.batchCode}`,
        description: `Consolidated (${dispatchedQty} total items, ${dispatchedWeightKg.toFixed(2)} kg dispatched) and sent to recycler facility.`,
        actorId: auth.user.id,
        actorName: auth.user.fullName,
        actorRole: auth.user.role,
        location: `${r.city}, ${r.state}`,
      });

      await createNotification({
        userId: r.citizenId,
        title: `Dispatched to Recycler (${r.requestCode})`,
        message: `Your verified e-waste has been consolidated into batch ${createdBatch.batchCode} and dispatched to the recycler.`,
        type: "info",
        relatedUrl: "/dashboard/citizen",
      });
    }

    if (recyclerId) {
      await createNotification({
        userId: recyclerId,
        title: `Incoming Recycling Batch: ${createdBatch.batchCode}`,
        message: `${dispatchedQty} items (${dispatchedWeightKg.toFixed(2)} kg dispatched) awaiting physical receipt and weighbridge confirmation.`,
        type: "info",
        relatedUrl: "/dashboard/recycler",
      });
    }

    await recordAuditLog({
      actor: auth.user,
      action: "BATCH_CREATED",
      entityType: "recycling_batch",
      entityId: createdBatch.batchCode,
      details: {
        requestIds: parsed.data.requestIds,
        dispatchedQty,
        dispatchedWeightKg,
      },
    });

    return NextResponse.json({ batch: createdBatch }, { status: 201 });
  } catch (err) {
    console.error("POST batch error:", err);
    return NextResponse.json(
      { error: "Failed to create recycling batch." },
      { status: 500 }
    );
  }
}
