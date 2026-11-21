import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db, sessions, users, auditLogs, notifications, type UserRole } from "@/db";

export const SESSION_COOKIE_NAME = "ecotrace_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SafeUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  phone: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  organizationName: string | null;
  greenPoints: number;
  isActive: boolean;
  isDemoAccount: boolean;
  createdAt: Date;
}

export function sanitizeUser(user: typeof users.$inferSelect): SafeUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
    city: user.city,
    state: user.state,
    address: user.address,
    organizationName: user.organizationName,
    greenPoints: user.greenPoints,
    isActive: user.isActive,
    isDemoAccount: user.isDemoAccount,
    createdAt: user.createdAt,
  };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function isHttpsRequest(): Promise<boolean> {
  try {
    const hdrs = await headers();
    const forwardedProto = hdrs.get("x-forwarded-proto");
    if (forwardedProto) {
      return forwardedProto.split(",")[0].trim() === "https";
    }
    const origin = hdrs.get("origin") || hdrs.get("referer") || "";
    return origin.startsWith("https://");
  } catch {
    return false;
  }
}

export async function createSession(userId: number): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  const cookieStore = await cookies();
  const secure = await isHttpsRequest();

  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: expiresAt,
  });

  return rawToken;
}

export async function revokeCurrentSession(): Promise<void> {
  // Delete the current database session without emitting a second Set-Cookie header.
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(rawToken)));
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  const secure = await isHttpsRequest();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: new Date(0),
  });
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!rawToken) return null;

    const tokenHash = hashToken(rawToken);
    const now = new Date();

    const rows = await db
      .select({
        user: users,
        session: sessions,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const found = rows[0].user;
    if (!found.isActive) {
      return null;
    }

    return sanitizeUser(found);
  } catch {
    return null;
  }
}

export async function requireRole(allowedRoles?: UserRole[]): Promise<
  | { ok: true; user: SafeUser }
  | { ok: false; status: 401 | 403; error: string }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, status: 401, error: "Authentication required. Please log in." };
  }
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return {
      ok: false,
      status: 403,
      error: `Access denied. Required role: ${allowedRoles.join(", ")}.`,
    };
  }
  return { ok: true, user };
}

export async function recordAuditLog(params: {
  actor?: SafeUser | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  details?: Record<string, unknown> | null;
}) {
  try {
    await db.insert(auditLogs).values({
      actorId: params.actor?.id ?? null,
      actorEmail: params.actor?.email ?? "system",
      actorRole: params.actor?.role ?? "system",
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId != null ? String(params.entityId) : null,
      details: params.details ?? null,
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

export async function createNotification(params: {
  userId: number;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "alert";
  relatedUrl?: string;
}) {
  try {
    await db.insert(notifications).values({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type ?? "info",
      relatedUrl: params.relatedUrl ?? null,
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}
