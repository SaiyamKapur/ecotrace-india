import { and, eq, ne } from "drizzle-orm";
import { db, productListings, type ListingStatus, type PickupStatus } from "@/db";
import { formatINR } from "@/lib/constants";

export function listingStatusFromPickup(status: PickupStatus): ListingStatus {
  switch (status) {
    case "collected": return "collected";
    case "verified": return "verified";
    case "batched":
    case "received_by_recycler":
    case "processing": return "recycling";
    case "documented": return "settlement_ready";
    case "cancelled": return "accepted";
    default: return "pickup_booked";
  }
}

export async function syncListingsForRequest(requestId: number, pickupStatus: PickupStatus) {
  const next = listingStatusFromPickup(pickupStatus);
  await db.update(productListings).set({
    status: next,
    ...(pickupStatus === "cancelled" ? { requestId: null } : {}),
    updatedAt: new Date(),
  }).where(and(eq(productListings.requestId, requestId), ne(productListings.status, "paid")));
}

export function sampleStatementNote(): string {
  return "SAMPLE SETTLEMENT STATEMENT — NOT A TAX INVOICE, BANK TRANSFER RECEIPT, OR PROOF OF REAL PAYMENT. INR figures are simulated values for this project.";
}

export function calculateFinalAmount(quotedPaise: number, listedQty: number, collectedQty: number) {
  const qty = Math.min(Math.max(0, collectedQty), listedQty);
  const amount = Math.round((quotedPaise * qty) / Math.max(listedQty, 1) / 100) * 100;
  const adjustmentReason = qty < listedQty
    ? `Quantity adjusted after physical pickup: ${qty}/${listedQty} listed item(s) received. ${formatINR(quotedPaise)} offered → ${formatINR(amount)} final. Admin review required.`
    : "Offer confirmed after physical collection and documented recycling; no quantity adjustment.";
  return { amount, adjustmentReason };
}
