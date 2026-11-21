import { NextResponse } from "next/server";
import { destroySession, getCurrentUser, recordAuditLog } from "@/lib/auth";

export async function POST() {
  try {
    const user = await getCurrentUser();
    await destroySession();

    if (user) {
      await recordAuditLog({
        actor: user,
        action: "USER_LOGOUT",
        entityType: "user",
        entityId: user.id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Logout failed." }, { status: 500 });
  }
}
