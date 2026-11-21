import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import {
  createSession,
  getCurrentUser,
  recordAuditLog,
  revokeCurrentSession,
  sanitizeUser,
  verifyPassword,
} from "@/lib/auth";
import { ROLE_DASHBOARD_ROUTES } from "@/lib/constants";
import { ensureSeeded } from "@/lib/seed";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export async function POST(req: Request) {
  try {
    await ensureSeeded();

    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid login input." },
        { status: 400 }
      );
    }

    const emailNormalized = parsed.data.email.toLowerCase();

    const found = await db
      .select()
      .from(users)
      .where(eq(users.email, emailNormalized))
      .limit(1);

    if (found.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const user = found[0];
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Your account is currently deactivated. Contact platform admin." },
        { status: 403 }
      );
    }

    const passwordValid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const previousUser = await getCurrentUser();
    if (previousUser) await revokeCurrentSession();
    await createSession(user.id);
    const safeUser = sanitizeUser(user);

    await recordAuditLog({
      actor: safeUser,
      action: "USER_LOGIN",
      entityType: "user",
      entityId: user.id,
      details: { role: user.role },
    });

    return NextResponse.json({
      user: safeUser,
      redirectTo: ROLE_DASHBOARD_ROUTES[user.role] || "/dashboard/citizen",
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Unable to complete login right now. Please try again." },
      { status: 500 }
    );
  }
}
