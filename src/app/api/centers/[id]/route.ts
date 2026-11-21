import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, collectionCenters } from "@/db";
import { recordAuditLog, requireRole } from "@/lib/auth";

const updateCenterSchema = z.object({
  name: z.string().trim().min(3).max(200).optional(),
  operatingHours: z.string().trim().min(3).max(200).optional(),
  acceptedCategories: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
  currentLoadKg: z.number().min(0).optional(),
  capacityKg: z.number().positive().optional(),
  verificationLabel: z.string().trim().min(3).max(200).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(["admin", "center_manager"]);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const centerId = Number(id);
    if (!Number.isInteger(centerId)) {
      return NextResponse.json({ error: "Invalid center ID." }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parsed = updateCenterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update payload." },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(collectionCenters)
      .set(parsed.data)
      .where(eq(collectionCenters.id, centerId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Collection center not found." }, { status: 404 });
    }

    await recordAuditLog({
      actor: auth.user,
      action: "CENTER_UPDATED",
      entityType: "collection_center",
      entityId: updated.code,
      details: parsed.data,
    });

    return NextResponse.json({ center: updated });
  } catch (err) {
    console.error("PATCH center error:", err);
    return NextResponse.json({ error: "Failed to update center." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(["admin"]);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const centerId = Number(id);
    if (!Number.isInteger(centerId)) {
      return NextResponse.json({ error: "Invalid center ID." }, { status: 400 });
    }

    const [deleted] = await db
      .delete(collectionCenters)
      .where(eq(collectionCenters.id, centerId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Collection center not found." }, { status: 404 });
    }

    await recordAuditLog({
      actor: auth.user,
      action: "CENTER_DELETED",
      entityType: "collection_center",
      entityId: deleted.code,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE center error:", err);
    return NextResponse.json({ error: "Failed to delete center." }, { status: 500 });
  }
}
