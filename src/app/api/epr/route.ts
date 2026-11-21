import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, eprRecords, recyclingBatches } from "@/db";
import { recordAuditLog, requireRole } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const auth = await requireRole(["organization", "admin", "recycler"]);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [records, batches] = await Promise.all([
      db.select().from(eprRecords).orderBy(desc(eprRecords.createdAt)),
      db.select().from(recyclingBatches),
    ]);

    const batchMap = new Map(batches.map((b) => [b.id, b]));

    const enriched = records.map((r) => ({
      ...r,
      batch: r.batchId ? batchMap.get(r.batchId) ?? null : null,
    }));

    return NextResponse.json({
      records: enriched,
      statutoryDisclaimer:
        "EcoTrace EPR records track internal operational traceability across requested, collected, received, processed, and documented quantities. Collected e-waste does NOT automatically generate legally recognized statutory EPR credits or CPCB certificates.",
    });
  } catch (err) {
    console.error("GET EPR error:", err);
    return NextResponse.json(
      { error: "Failed to load EPR records." },
      { status: 500 }
    );
  }
}

const patchEprSchema = z.object({
  id: z.number().int().positive(),
  verificationStatus: z.enum([
    "draft_record",
    "verified_internal",
    "discrepancy_flagged",
  ]),
  notes: z.string().max(600).optional(),
});

export async function PATCH(req: Request) {
  try {
    const auth = await requireRole(["admin"]);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = patchEprSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid EPR update." }, { status: 400 });
    }

    const [updated] = await db
      .update(eprRecords)
      .set({
        verificationStatus: parsed.data.verificationStatus,
        notes: parsed.data.notes,
        updatedAt: new Date(),
      })
      .where(eq(eprRecords.id, parsed.data.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "EPR record not found." }, { status: 404 });
    }

    await recordAuditLog({
      actor: auth.user,
      action: "EPR_RECORD_REVIEWED",
      entityType: "epr_record",
      entityId: updated.recordCode,
      details: { verificationStatus: updated.verificationStatus },
    });

    return NextResponse.json({ record: updated });
  } catch (err) {
    console.error("PATCH EPR error:", err);
    return NextResponse.json(
      { error: "Failed to update EPR record." },
      { status: 500 }
    );
  }
}
