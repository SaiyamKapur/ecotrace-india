import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, users } from "@/db";
import { recordAuditLog, requireRole, sanitizeUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const auth = await requireRole(["admin", "center_manager"]);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const list = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json({
      users: list.map(sanitizeUser),
    });
  } catch (err) {
    console.error("GET admin users error:", err);
    return NextResponse.json({ error: "Failed to load users." }, { status: 500 });
  }
}

const updateUserSchema = z.object({
  id: z.number().int().positive(),
  role: z
    .enum(["citizen", "partner", "recycler", "organization", "center_manager", "admin"])
    .optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  try {
    const auth = await requireRole(["admin"]);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid user update." }, { status: 400 });
    }

    if (parsed.data.id === auth.user.id && parsed.data.isActive === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own admin account." },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(users)
      .set({
        ...(parsed.data.role ? { role: parsed.data.role } : {}),
        ...(parsed.data.isActive !== undefined
          ? { isActive: parsed.data.isActive }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, parsed.data.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    await recordAuditLog({
      actor: auth.user,
      action: "USER_UPDATED",
      entityType: "user",
      entityId: updated.id,
      details: { role: updated.role, isActive: updated.isActive },
    });

    return NextResponse.json({ user: sanitizeUser(updated) });
  } catch (err) {
    console.error("PATCH admin user error:", err);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}
