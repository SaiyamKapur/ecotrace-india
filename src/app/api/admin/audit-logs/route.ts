import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, auditLogs } from "@/db";
import { requireRole } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const auth = await requireRole(["admin"]);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);

    const filtered = q
      ? rows.filter((r) =>
          `${r.action} ${r.entityType} ${r.entityId ?? ""} ${r.actorEmail ?? ""} ${r.actorRole ?? ""}`
            .toLowerCase()
            .includes(q)
        )
      : rows;

    return NextResponse.json({ logs: filtered });
  } catch (err) {
    console.error("GET audit logs error:", err);
    return NextResponse.json(
      { error: "Failed to load audit logs." },
      { status: 500 }
    );
  }
}
