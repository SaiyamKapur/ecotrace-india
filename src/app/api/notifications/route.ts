import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, notifications } from "@/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireRole();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, auth.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(30);

    return NextResponse.json({ notifications: list });
  } catch (err) {
    console.error("GET notifications error:", err);
    return NextResponse.json(
      { error: "Failed to load notifications." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireRole();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => ({}));
    if (body?.markAllRead) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, auth.user.id));
    } else if (typeof body?.id === "number") {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.id, body.id),
            eq(notifications.userId, auth.user.id)
          )
        );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH notifications error:", err);
    return NextResponse.json(
      { error: "Failed to update notifications." },
      { status: 500 }
    );
  }
}
