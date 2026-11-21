import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, collectionCenters } from "@/db";
import { recordAuditLog, requireRole } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const state = (searchParams.get("state") || "").trim().toLowerCase();
    const category = (searchParams.get("category") || "").trim().toLowerCase();
    const includeInactive = searchParams.get("includeInactive") === "true";

    const rows = await db
      .select()
      .from(collectionCenters)
      .orderBy(desc(collectionCenters.id));

    const filtered = rows.filter((c) => {
      if (!includeInactive && !c.isActive) return false;
      if (state && state !== "all" && c.state.toLowerCase() !== state) return false;
      if (category && category !== "all") {
        const hasCat = (c.acceptedCategories || []).some(
          (cat) => cat.toLowerCase() === category
        );
        if (!hasCat) return false;
      }
      if (q) {
        const hay = `${c.name} ${c.city} ${c.state} ${c.district ?? ""} ${c.pincode ?? ""} ${c.code} ${c.address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // Featured Punjab demo pilot: requested city sequence before other sample regions.
    const priority = ["PB-LDH-DEMO-01", "PB-ASR-DEMO-07", "PB-JLD-DEMO-08", "PB-PGW-DEMO-09", "PB-MHL-DEMO-10", "PB-PTL-DEMO-11"];
    filtered.sort((a, b) => {
      const ia = priority.indexOf(a.code);
      const ib = priority.indexOf(b.code);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 100 : ia) - (ib === -1 ? 100 : ib);
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      centers: filtered,
      total: filtered.length,
    });
  } catch (err) {
    console.error("GET centers error:", err);
    return NextResponse.json(
      { error: "Failed to load collection centers." },
      { status: 500 }
    );
  }
}

const createCenterSchema = z.object({
  code: z.string().trim().min(3).max(40),
  name: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  district: z.string().trim().max(100).optional(),
  address: z.string().trim().min(5).max(400),
  pincode: z.string().trim().max(20).optional(),
  latitude: z.number().min(6).max(38),
  longitude: z.number().min(68).max(98),
  acceptedCategories: z.array(z.string()).min(1),
  operatingHours: z.string().trim().min(3).max(200),
  contactPhone: z.string().trim().max(40).optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  verificationLabel: z.string().trim().min(3).max(200),
  isDemoSample: z.boolean().default(true),
  capacityKg: z.number().positive().default(2000),
});

export async function POST(req: Request) {
  try {
    const auth = await requireRole(["admin"]);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = createCenterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid center payload." },
        { status: 400 }
      );
    }

    const existing = await db
      .select({ id: collectionCenters.id })
      .from(collectionCenters)
      .where(eq(collectionCenters.code, parsed.data.code))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A collection center with this code already exists." },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(collectionCenters)
      .values({
        ...parsed.data,
        district: parsed.data.district || parsed.data.city,
        pincode: parsed.data.pincode || null,
        contactPhone: parsed.data.contactPhone || null,
        contactEmail: parsed.data.contactEmail || null,
      })
      .returning();

    await recordAuditLog({
      actor: auth.user,
      action: "CENTER_CREATED",
      entityType: "collection_center",
      entityId: created.code,
      details: { name: created.name, city: created.city, state: created.state },
    });

    return NextResponse.json({ center: created }, { status: 201 });
  } catch (err) {
    console.error("POST center error:", err);
    return NextResponse.json(
      { error: "Failed to create collection center." },
      { status: 500 }
    );
  }
}
