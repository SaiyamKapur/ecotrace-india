import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, productListings, pickupRequests, settlementRecords, users } from "@/db";
import { getCurrentUser, requireRole, createNotification, recordAuditLog } from "@/lib/auth";
import { EWASTE_CATEGORIES, PRODUCT_IMAGE_BY_CATEGORY, indicativeValuePaise } from "@/lib/constants";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(req.url);
    const showcase = searchParams.get("showcase") === "1";
    const user = await getCurrentUser();
    if (!showcase && !user) return NextResponse.json({ error: "Please log in to see your listings." }, { status: 401 });
    const rows = showcase
      ? await db.select().from(productListings).where(eq(productListings.isDemoRecord, true)).orderBy(desc(productListings.createdAt))
      : user?.role === "admin"
        ? await db.select().from(productListings).orderBy(desc(productListings.createdAt))
        : await db.select().from(productListings).where(eq(productListings.ownerId, user!.id)).orderBy(desc(productListings.createdAt));

    if (showcase) {
      return NextResponse.json({ listings: rows.map((l) => ({
        id: l.id, listingCode: l.listingCode, title: l.title, brand: l.brand,
        model: l.model, category: l.category, condition: l.condition,
        quantity: l.quantity, imageUrl: l.imageUrl, description: l.description,
        city: l.city, state: l.state, indicativeValuePaise: l.indicativeValuePaise,
        status: l.status, isDemoRecord: true,
      })) });
    }

    const [requests, settlements, owners] = await Promise.all([
      db.select({ id: pickupRequests.id, requestCode: pickupRequests.requestCode, status: pickupRequests.status,
        requestedTotalQty: pickupRequests.requestedTotalQty, actualCollectedQty: pickupRequests.actualCollectedQty,
        estimatedWeightKg: pickupRequests.estimatedWeightKg, actualCollectedWeightKg: pickupRequests.actualCollectedWeightKg,
        batchId: pickupRequests.batchId, discrepancyFlag: pickupRequests.discrepancyFlag }).from(pickupRequests),
      db.select().from(settlementRecords),
      user?.role === "admin" ? db.select({ id: users.id, fullName: users.fullName, email: users.email }).from(users) : Promise.resolve([]),
    ]);
    const reqMap = new Map(requests.map((p) => [p.id, p]));
    const settlementMap = new Map(settlements.map((s) => [s.listingId, s]));
    const ownerMap = new Map(owners.map((u) => [u.id, u]));
    return NextResponse.json({ listings: rows.map((l) => ({
      ...l,
      request: l.requestId ? reqMap.get(l.requestId) ?? null : null,
      settlement: settlementMap.get(l.id) ?? null,
      ...(user?.role === "admin" ? { owner: ownerMap.get(l.ownerId) ?? null } : {}),
    })) });
  } catch (e) {
    console.error("GET listings failed", e);
    return NextResponse.json({ error: "Could not load product listings." }, { status: 500 });
  }
}

const listingSchema = z.object({
  title: z.string().trim().min(4).max(180),
  category: z.string().refine((c) => EWASTE_CATEGORIES.some((e) => e.id === c), "Choose a supported device category."),
  brand: z.string().trim().max(100).optional(),
  model: z.string().trim().max(120).optional(),
  condition: z.enum(["working", "repairable", "non_working"]),
  quantity: z.number().int().min(1).max(50),
  description: z.string().trim().max(700).optional(),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  imageDataUrl: z.string().max(800_000).optional(),
});

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const auth = await requireRole(["citizen", "organization"]);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const parsed = listingSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid listing." }, { status: 400 });
    const input = parsed.data;
    let imageUrl = PRODUCT_IMAGE_BY_CATEGORY[input.category];
    if (input.imageDataUrl) {
      const match = input.imageDataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!match || Buffer.from(match[2], "base64").byteLength > 560_000) {
        return NextResponse.json({ error: "Upload a JPG, PNG or WEBP image smaller than 550 KB. The browser automatically compresses photos." }, { status: 400 });
      }
      imageUrl = input.imageDataUrl;
    }
    const indicative = indicativeValuePaise(input.category, input.condition, input.quantity);
    const [listing] = await db.insert(productListings).values({
      listingCode: `LIST-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      ownerId: auth.user.id,
      title: input.title,
      brand: input.brand || null,
      model: input.model || null,
      category: input.category,
      condition: input.condition,
      quantity: input.quantity,
      imageUrl,
      description: input.description || null,
      city: input.city,
      state: input.state,
      indicativeValuePaise: indicative,
      isDemoRecord: false,
    }).returning();
    await recordAuditLog({ actor: auth.user, action: "PRODUCT_LISTED", entityType: "product_listing", entityId: listing.listingCode,
      details: { category: listing.category, quantity: listing.quantity, indicativeValuePaise: indicative } });
    await createNotification({ userId: auth.user.id, title: `Product listed · ${listing.listingCode}`, message: "Your product photo was saved. Indicative pricing is a demonstration only; an admin must review and send an offer.", type: "success", relatedUrl: "/dashboard/citizen?tab=marketplace" });
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    for (const adm of admins) await createNotification({ userId: adm.id, title: `New product to review · ${listing.listingCode}`, message: `${listing.title} in ${listing.city} is awaiting a sandbox offer.`, relatedUrl: "/dashboard/admin" });
    return NextResponse.json({ listing }, { status: 201 });
  } catch (e) {
    console.error("POST listing failed", e);
    return NextResponse.json({ error: "Could not create product listing." }, { status: 500 });
  }
}
