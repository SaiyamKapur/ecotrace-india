import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, notifications, users } from "@/db";
import { getCurrentUser, sanitizeUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null, unreadNotifications: 0 });
    }

    const unread = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));

    return NextResponse.json({
      user,
      unreadNotifications: unread.length,
    });
  } catch (err) {
    console.error("Auth me error:", err);
    return NextResponse.json({ error: "Session verification is temporarily unavailable." }, { status: 503 });
  }
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(40).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  state: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  organizationName: z.string().trim().max(200).optional().nullable(),
});

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid profile update." },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(users)
      .set({
        fullName: parsed.data.fullName ?? user.fullName,
        phone: parsed.data.phone !== undefined ? parsed.data.phone : user.phone,
        city: parsed.data.city !== undefined ? parsed.data.city : user.city,
        state: parsed.data.state !== undefined ? parsed.data.state : user.state,
        address: parsed.data.address !== undefined ? parsed.data.address : user.address,
        organizationName:
          parsed.data.organizationName !== undefined
            ? parsed.data.organizationName
            : user.organizationName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return NextResponse.json({ user: sanitizeUser(updated) });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
