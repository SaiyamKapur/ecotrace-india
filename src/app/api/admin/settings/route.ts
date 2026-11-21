import { NextResponse } from "next/server";
import { z } from "zod";
import { db, platformSettings } from "@/db";
import { recordAuditLog, requireRole } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const rows = await db.select().from(platformSettings);
    return NextResponse.json({ settings: rows });
  } catch (err) {
    console.error("GET settings error:", err);
    return NextResponse.json(
      { error: "Failed to load platform settings." },
      { status: 500 }
    );
  }
}

const patchSettingSchema = z.object({
  key: z.string().trim().min(2).max(120),
  value: z.record(z.string(), z.unknown()),
  description: z.string().max(400).optional(),
});

export async function PATCH(req: Request) {
  try {
    const auth = await requireRole(["admin"]);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = patchSettingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid setting payload." }, { status: 400 });
    }

    const [updated] = await db
      .insert(platformSettings)
      .values({
        key: parsed.data.key,
        value: parsed.data.value,
        description: parsed.data.description,
        updatedBy: auth.user.id,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: {
          value: parsed.data.value,
          ...(parsed.data.description
            ? { description: parsed.data.description }
            : {}),
          updatedBy: auth.user.id,
          updatedAt: new Date(),
        },
      })
      .returning();

    await recordAuditLog({
      actor: auth.user,
      action: "SETTINGS_UPDATED",
      entityType: "platform_setting",
      entityId: parsed.data.key,
      details: parsed.data.value,
    });

    return NextResponse.json({ setting: updated });
  } catch (err) {
    console.error("PATCH settings error:", err);
    return NextResponse.json(
      { error: "Failed to save settings." },
      { status: 500 }
    );
  }
}
