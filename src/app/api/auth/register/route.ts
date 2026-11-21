import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import {
  createSession,
  hashPassword,
  recordAuditLog,
  sanitizeUser,
  createNotification,
} from "@/lib/auth";
import { ROLE_DASHBOARD_ROUTES } from "@/lib/constants";
import { ensureSeeded } from "@/lib/seed";

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters.").max(120),
  email: z.string().trim().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
    .regex(/[0-9]/, "Password must include at least one number."),
  role: z
    .enum(["citizen", "partner", "recycler", "organization", "center_manager"])
    .default("citizen"),
  phone: z.string().trim().max(40).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  address: z.string().trim().max(500).optional(),
  organizationName: z.string().trim().max(200).optional(),
});

export async function POST(req: Request) {
  try {
    await ensureSeeded();

    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid registration details." },
        { status: 400 }
      );
    }

    const emailNormalized = parsed.data.email.toLowerCase();

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, emailNormalized))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const [created] = await db
      .insert(users)
      .values({
        email: emailNormalized,
        passwordHash,
        fullName: parsed.data.fullName,
        role: parsed.data.role,
        phone: parsed.data.phone || null,
        city: parsed.data.city || "Ludhiana",
        state: parsed.data.state || "Punjab",
        address: parsed.data.address || null,
        organizationName: parsed.data.organizationName || null,
        greenPoints: 0,
        isActive: true,
        isDemoAccount: false,
      })
      .returning();

    await createSession(created.id);
    const safeUser = sanitizeUser(created);

    await createNotification({
      userId: created.id,
      title: "Welcome to EcoTrace India",
      message:
        "Your account is ready. Upload e-waste images, explore demonstration collection centers, and track every stage transparently.",
      type: "success",
      relatedUrl: ROLE_DASHBOARD_ROUTES[created.role],
    });

    await recordAuditLog({
      actor: safeUser,
      action: "USER_REGISTERED",
      entityType: "user",
      entityId: created.id,
      details: { role: created.role },
    });

    return NextResponse.json(
      {
        user: safeUser,
        redirectTo: ROLE_DASHBOARD_ROUTES[created.role],
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Unable to create account right now." },
      { status: 500 }
    );
  }
}
