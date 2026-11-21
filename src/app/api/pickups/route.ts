import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import {
  db,
  pickupRequests,
  traceabilityEvents,
  collectionCenters,
  users,
  recyclingBatches,
  productListings,
} from "@/db";
import { createNotification, recordAuditLog, requireRole } from "@/lib/auth";
import { getEstimatedUnitWeight } from "@/lib/constants";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const auth = await requireRole();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = (searchParams.get("status") || "").trim();
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    let rows;
    if (auth.user.role === "citizen" || auth.user.role === "organization") {
      rows = await db
        .select()
        .from(pickupRequests)
        .where(eq(pickupRequests.citizenId, auth.user.id))
        .orderBy(desc(pickupRequests.createdAt));
    } else if (auth.user.role === "partner") {
      rows = await db
        .select()
        .from(pickupRequests)
        .where(eq(pickupRequests.assignedPartnerId, auth.user.id))
        .orderBy(desc(pickupRequests.createdAt));
    } else {
      // admin, center_manager, recycler
      rows = await db
        .select()
        .from(pickupRequests)
        .orderBy(desc(pickupRequests.createdAt));
    }

    const [allUsers, allCenters, allBatches] = await Promise.all([
      db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          phone: users.phone,
        })
        .from(users),
      db.select().from(collectionCenters),
      db.select().from(recyclingBatches),
    ]);

    const userById = new Map(allUsers.map((u) => [u.id, u]));
    const centerById = new Map(allCenters.map((c) => [c.id, c]));
    const batchById = new Map(allBatches.map((b) => [b.id, b]));

    const enriched = rows
      .filter((r) => {
        if (statusFilter && statusFilter !== "all" && r.status !== statusFilter) {
          return false;
        }
        if (search) {
          const citizenName = userById.get(r.citizenId)?.fullName || "";
          const hay = `${r.requestCode} ${r.city} ${r.state} ${r.pickupAddress} ${citizenName}`.toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      })
      .map((r) => ({
        ...r,
        citizen: userById.get(r.citizenId) ?? null,
        assignedPartner: r.assignedPartnerId
          ? userById.get(r.assignedPartnerId) ?? null
          : null,
        collectionCenter: r.collectionCenterId
          ? centerById.get(r.collectionCenterId) ?? null
          : null,
        batch: r.batchId ? batchById.get(r.batchId) ?? null : null,
      }));

    return NextResponse.json({ requests: enriched });
  } catch (err) {
    console.error("GET pickups error:", err);
    return NextResponse.json(
      { error: "Failed to load pickup requests." },
      { status: 500 }
    );
  }
}

const createPickupSchema = z.object({
  items: z
    .array(
      z.object({
        category: z.string().trim().min(2),
        quantity: z.number().int().min(1).max(500),
        aiPredictedCategory: z.string().optional(),
        aiConfidence: z.number().min(0).max(1).nullable().optional(),
        userCorrected: z.boolean().optional(),
        notes: z.string().max(300).optional(),
      })
    )
    .min(1, "Please add at least one e-waste item."),
  pickupAddress: z.string().trim().min(5, "Pickup address is required.").max(400),
  city: z.string().trim().min(2, "City is required.").max(100),
  state: z.string().trim().min(2, "State is required.").max(100),
  pincode: z.string().trim().max(20).optional(),
  preferredDate: z.string().trim().min(8, "Preferred pickup date is required."),
  preferredTimeSlot: z.string().trim().min(3, "Preferred time slot is required."),
  collectionCenterId: z.number().int().positive().nullable().optional(),
  citizenNotes: z.string().trim().max(600).optional(),
  imageDataUrl: z.string().max(1_500_000).nullable().optional(),
  aiClassificationMode: z
    .enum(["live_vision_api", "demo_mode", "manual"])
    .default("manual"),
  aiRawSummary: z.record(z.string(), z.unknown()).nullable().optional(),
  listingId: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const auth = await requireRole([
      "citizen",
      "organization",
      "admin",
      "center_manager",
    ]);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = createPickupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid pickup request details." },
        { status: 400 }
      );
    }

    let acceptedListing: typeof productListings.$inferSelect | undefined;
    if (parsed.data.listingId) {
      const [candidate] = await db.select().from(productListings).where(eq(productListings.id, parsed.data.listingId)).limit(1);
      if (!candidate || candidate.ownerId !== auth.user.id || candidate.status !== "accepted" || candidate.requestId) {
        return NextResponse.json({ error: "This product must belong to you and have an accepted offer without another pickup." }, { status: 409 });
      }
      const matches = parsed.data.items.some((i) => i.category === candidate.category && i.quantity >= candidate.quantity);
      if (!matches) return NextResponse.json({ error: `Include at least ${candidate.quantity} item(s) in ${candidate.category} for your linked product.` }, { status: 400 });
      acceptedListing = candidate;
    }

    const normalizedItems = parsed.data.items.map((item) => {
      const unitWeight = getEstimatedUnitWeight(item.category);
      return {
        category: item.category,
        quantity: item.quantity,
        estimatedUnitWeightKg: unitWeight,
        estimatedTotalWeightKg: Number((unitWeight * item.quantity).toFixed(2)),
        aiPredictedCategory: item.aiPredictedCategory,
        aiConfidence: item.aiConfidence ?? null,
        userCorrected: Boolean(item.userCorrected),
        notes: item.notes,
      };
    });

    const requestedTotalQty = normalizedItems.reduce((s, i) => s + i.quantity, 0);
    const estimatedWeightKg = Number(
      normalizedItems.reduce((s, i) => s + i.estimatedTotalWeightKg, 0).toFixed(2)
    );

    // Generate unique request ID
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const requestCode = `ECO-${new Date().getFullYear()}-${suffix}-${Date.now().toString().slice(-3)}`;

    // Default to matching state center or Punjab demonstration hub if unspecified
    let centerId = parsed.data.collectionCenterId ?? null;
    if (!centerId) {
      const centers = await db.select().from(collectionCenters);
      const matched =
        centers.find(
          (c) => c.state.toLowerCase() === parsed.data.state.toLowerCase()
        ) ?? centers.find((c) => c.code === "PB-LDH-DEMO-01");
      centerId = matched?.id ?? null;
    }

    const [created] = await db
      .insert(pickupRequests)
      .values({
        requestCode,
        citizenId: auth.user.id,
        collectionCenterId: centerId,
        status: "submitted",
        items: normalizedItems,
        requestedTotalQty,
        estimatedWeightKg,
        actualCollectedQty: null,
        actualCollectedWeightKg: null,
        imageDataUrl: parsed.data.imageDataUrl ?? null,
        aiClassificationMode: parsed.data.aiClassificationMode,
        aiRawSummary: parsed.data.aiRawSummary ?? null,
        pickupAddress: parsed.data.pickupAddress,
        city: parsed.data.city,
        state: parsed.data.state,
        pincode: parsed.data.pincode || null,
        preferredDate: parsed.data.preferredDate,
        preferredTimeSlot: parsed.data.preferredTimeSlot,
        citizenNotes: parsed.data.citizenNotes || null,
        isDemoRecord: false,
      })
      .returning();

    if (acceptedListing) {
      await db.update(productListings).set({ requestId: created.id, status: "pickup_booked", updatedAt: new Date() }).where(eq(productListings.id, acceptedListing.id));
      await db.insert(traceabilityEvents).values({
        requestId: created.id,
        stage: "product_linked",
        title: `Customer product ${acceptedListing.listingCode} linked`,
        description: `Accepted demo offer for ${acceptedListing.title} linked to this physical pickup. Settlement only follows verification and documented processing; no payment has been made.`,
        actorId: auth.user.id,
        actorName: auth.user.fullName,
        actorRole: auth.user.role,
        location: `${created.city}, ${created.state}`,
      });
    }

    await db.insert(traceabilityEvents).values({
      requestId: created.id,
      stage: "submitted",
      title: "E-Waste Pickup Request Submitted",
      description: `${requestedTotalQty} item(s) submitted with an estimated weight of ${estimatedWeightKg.toFixed(2)} kg (estimate only; actual physical weight will be measured on collection).`,
      actorId: auth.user.id,
      actorName: auth.user.fullName,
      actorRole: auth.user.role,
      location: `${created.city}, ${created.state}`,
      metadata: {
        aiMode: created.aiClassificationMode,
        itemCount: normalizedItems.length,
      },
    });

    await createNotification({
      userId: auth.user.id,
      title: `Pickup Request Created (${created.requestCode})`,
      message: `Your request for ${requestedTotalQty} item(s) (~${estimatedWeightKg.toFixed(2)} kg est.) is awaiting admin review and partner assignment.`,
      type: "success",
      relatedUrl: "/dashboard/citizen",
    });

    // Notify admins
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));
    for (const adm of admins) {
      await createNotification({
        userId: adm.id,
        title: `New Pickup Request: ${created.requestCode}`,
        message: `${auth.user.fullName} submitted ${requestedTotalQty} item(s) in ${created.city}, ${created.state}.`,
        type: "info",
        relatedUrl: "/dashboard/admin",
      });
    }

    await recordAuditLog({
      actor: auth.user,
      action: "PICKUP_CREATED",
      entityType: "pickup_request",
      entityId: created.requestCode,
      details: {
        requestedTotalQty,
        estimatedWeightKg,
        aiClassificationMode: created.aiClassificationMode,
      },
    });

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (err) {
    console.error("POST pickup error:", err);
    return NextResponse.json(
      { error: "Failed to create pickup request." },
      { status: 500 }
    );
  }
}
