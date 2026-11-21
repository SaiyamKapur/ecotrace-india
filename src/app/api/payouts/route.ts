import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, settlementRecords, productListings, pickupRequests, recyclingBatches } from "@/db";
import { createNotification, getCurrentUser, recordAuditLog, requireRole } from "@/lib/auth";
import { calculateFinalAmount, sampleStatementNote } from "@/lib/marketplace";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const rows = user.role === "admin"
      ? await db.select().from(settlementRecords).orderBy(desc(settlementRecords.createdAt))
      : await db.select().from(settlementRecords).where(eq(settlementRecords.ownerId, user.id)).orderBy(desc(settlementRecords.createdAt));
    const balancePaise = rows.filter((p) => p.status === "credited").reduce((sum, p) => sum + p.finalAmountPaise, 0);
    return NextResponse.json({ payouts: rows, balancePaise, disclaimer: sampleStatementNote() });
  } catch (e) {
    console.error("GET payouts failed", e);
    return NextResponse.json({ error: "Could not load settlement ledger." }, { status: 500 });
  }
}

const createSchema = z.object({ listingId: z.number().int().positive() });

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const auth = await requireRole(["admin"]);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Valid listing ID required." }, { status: 400 });
    const [listing] = await db.select().from(productListings).where(eq(productListings.id, parsed.data.listingId)).limit(1);
    if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    if (!listing.requestId || !listing.offeredAmountPaise) return NextResponse.json({ error: "An accepted offer and linked pickup are required." }, { status: 409 });
    const [pickup] = await db.select().from(pickupRequests).where(eq(pickupRequests.id, listing.requestId)).limit(1);
    if (!pickup || pickup.citizenId !== listing.ownerId || pickup.status !== "documented" || pickup.discrepancyFlag) {
      return NextResponse.json({ error: "Only documented, discrepancy-free collections belonging to this customer are eligible for settlement." }, { status: 409 });
    }
    const [batch] = pickup.batchId ? await db.select().from(recyclingBatches).where(eq(recyclingBatches.id, pickup.batchId)).limit(1) : [];
    if (!batch || batch.status !== "documented" || batch.discrepancyFlag) return NextResponse.json({ error: "Recycler documentation must be complete and discrepancy-free." }, { status: 409 });
    const existing = await db.select({ id: settlementRecords.id }).from(settlementRecords).where(eq(settlementRecords.listingId, listing.id)).limit(1);
    if (existing.length) return NextResponse.json({ error: "Settlement already exists for this listing." }, { status: 409 });
    const { amount, adjustmentReason } = calculateFinalAmount(listing.offeredAmountPaise, listing.quantity, pickup.actualCollectedQty ?? 0);
    if (!amount) return NextResponse.json({ error: "No confirmed units available for settlement." }, { status: 409 });
    const [created] = await db.insert(settlementRecords).values({
      statementCode: `STMT-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      listingId: listing.id, ownerId: listing.ownerId, requestId: pickup.id,
      quotedAmountPaise: listing.offeredAmountPaise, finalAmountPaise: amount,
      adjustmentReason, status: "pending_approval", method: "demo_wallet",
      notes: sampleStatementNote(), isDemoRecord: true,
    }).returning();
    await createNotification({ userId: listing.ownerId, title: `Settlement prepared · ${created.statementCode}`, message: "Your sandbox settlement is awaiting administrator review. No money has been transferred.", relatedUrl: "/dashboard/citizen?tab=marketplace" });
    await recordAuditLog({ actor: auth.user, action: "SETTLEMENT_PREPARED", entityType: "settlement", entityId: created.statementCode, details: { finalAmountPaise: amount, listingCode: listing.listingCode } });
    return NextResponse.json({ payout: created }, { status: 201 });
  } catch (e) {
    console.error("POST payout failed", e);
    return NextResponse.json({ error: "Could not prepare settlement." }, { status: 500 });
  }
}
