import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, settlementRecords, productListings, pickupRequests, recyclingBatches } from "@/db";
import { createNotification, recordAuditLog, requireRole } from "@/lib/auth";
import { formatINR } from "@/lib/constants";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(["admin"]);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const id = Number((await params).id);
    const body = await req.json().catch(() => null);
    if (!Number.isSafeInteger(id) || id < 1 || !["approve", "credit"].includes(body?.action)) return NextResponse.json({ error: "Invalid settlement action." }, { status: 400 });
    const [settlement] = await db.select().from(settlementRecords).where(eq(settlementRecords.id, id)).limit(1);
    if (!settlement) return NextResponse.json({ error: "Settlement not found." }, { status: 404 });
    const [pickup] = settlement.requestId ? await db.select().from(pickupRequests).where(eq(pickupRequests.id, settlement.requestId)).limit(1) : [];
    const [batch] = pickup?.batchId ? await db.select().from(recyclingBatches).where(eq(recyclingBatches.id, pickup.batchId)).limit(1) : [];
    if (!pickup || pickup.status !== "documented" || pickup.discrepancyFlag || !batch || batch.status !== "documented" || batch.discrepancyFlag) {
      return NextResponse.json({ error: "Payout blocked: recycling documentation must be complete and no discrepancies may remain." }, { status: 409 });
    }
    const approve = body.action === "approve";
    const expected = approve ? "pending_approval" : "approved";
    const next = approve ? "approved" : "credited";
    if (settlement.status !== expected) return NextResponse.json({ error: `Invalid transition from ${settlement.status}. Expected ${expected}.` }, { status: 409 });
    const [updated] = await db.update(settlementRecords).set({
      status: next,
      ...(approve ? { approvedAt: new Date() } : { creditedAt: new Date(), payoutReference: `DEMO-WALLET-${crypto.randomBytes(5).toString("hex").toUpperCase()}` }),
      updatedAt: new Date(),
    }).where(and(eq(settlementRecords.id, id), eq(settlementRecords.status, expected))).returning();
    if (!updated) return NextResponse.json({ error: "Already processed. Please refresh the ledger." }, { status: 409 });
    if (!approve) await db.update(productListings).set({ status: "paid", updatedAt: new Date() }).where(eq(productListings.id, settlement.listingId));
    await createNotification({ userId: settlement.ownerId,
      title: approve ? `Demo settlement approved · ${settlement.statementCode}` : `Demo wallet credited · ${settlement.statementCode}`,
      message: approve ? "Your sandbox payout has been approved and awaits simulation of wallet credit." : `${formatINR(updated.finalAmountPaise)} has been credited to your DEMO WALLET only. No real money or bank transfer took place. View your statement in My Products & Wallet.`,
      type: "success", relatedUrl: "/dashboard/citizen?tab=marketplace" });
    await recordAuditLog({ actor: auth.user, action: approve ? "SETTLEMENT_APPROVED" : "DEMO_WALLET_CREDITED", entityType: "settlement", entityId: settlement.statementCode, details: { finalAmountPaise: settlement.finalAmountPaise, method: "demo_wallet", realMoney: false } });
    return NextResponse.json({ payout: updated });
  } catch (e) {
    console.error("PATCH payout failed", e);
    return NextResponse.json({ error: "Could not update settlement." }, { status: 500 });
  }
}
