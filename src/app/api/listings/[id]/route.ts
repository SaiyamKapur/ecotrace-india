import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, productListings } from "@/db";
import { createNotification, recordAuditLog, requireRole } from "@/lib/auth";
import { formatINR } from "@/lib/constants";

const updateSchema = z.object({
  action: z.enum(["quote", "accept_quote", "decline_quote"]),
  amountPaise: z.number().int().min(100).max(10_000_000).optional(),
  notes: z.string().trim().max(400).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const id = Number((await params).id);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid listing ID." }, { status: 400 });
    const input = updateSchema.safeParse(await req.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message ?? "Invalid action." }, { status: 400 });
    const [listing] = await db.select().from(productListings).where(eq(productListings.id, id)).limit(1);
    if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    const { action } = input.data;
    if (action === "quote") {
      if (auth.user.role !== "admin") return NextResponse.json({ error: "Only an administrator may set an offer." }, { status: 403 });
      if (!["listed", "quoted", "declined"].includes(listing.status)) return NextResponse.json({ error: "This listing has moved past quoting." }, { status: 409 });
      if (input.data.amountPaise == null) return NextResponse.json({ error: "Offer amount is required." }, { status: 400 });
      const [updated] = await db.update(productListings).set({ status: "quoted", offeredAmountPaise: input.data.amountPaise, quoteNotes: input.data.notes || "Sample offer subject to item inspection and accepted quantity.", quotedAt: new Date(), updatedAt: new Date() }).where(eq(productListings.id, id)).returning();
      await createNotification({ userId: listing.ownerId, title: `Offer ready · ${listing.listingCode}`, message: `Review your ${formatINR(updated.offeredAmountPaise)} demonstration offer before booking pickup. This is not real money.`, type: "info", relatedUrl: "/dashboard/citizen?tab=marketplace" });
      await recordAuditLog({ actor: auth.user, action: "PRODUCT_QUOTED", entityType: "product_listing", entityId: listing.listingCode, details: { amountPaise: updated.offeredAmountPaise } });
      return NextResponse.json({ listing: updated });
    }
    if (listing.ownerId !== auth.user.id) return NextResponse.json({ error: "This listing belongs to another customer." }, { status: 403 });
    if (listing.status !== "quoted") return NextResponse.json({ error: "Only a current offer can be accepted or declined." }, { status: 409 });
    const status = action === "accept_quote" ? "accepted" : "declined";
    const [updated] = await db.update(productListings).set({ status, acceptedAt: status === "accepted" ? new Date() : null, updatedAt: new Date() }).where(eq(productListings.id, id)).returning();
    await recordAuditLog({ actor: auth.user, action: status === "accepted" ? "OFFER_ACCEPTED" : "OFFER_DECLINED", entityType: "product_listing", entityId: listing.listingCode, details: { amountPaise: listing.offeredAmountPaise } });
    return NextResponse.json({ listing: updated });
  } catch (e) {
    console.error("PATCH listing failed", e);
    return NextResponse.json({ error: "Could not update listing." }, { status: 500 });
  }
}
