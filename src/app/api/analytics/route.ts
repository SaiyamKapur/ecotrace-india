import { NextResponse } from "next/server";
import { getPlatformAnalytics, parseDateRange } from "@/lib/analytics";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(req.url);
    const window = parseDateRange({
      range: searchParams.get("range"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });

    const analytics = await getPlatformAnalytics(window);
    return NextResponse.json(analytics);
  } catch (err) {
    console.error("GET analytics error:", err);
    return NextResponse.json(
      { error: "Failed to load analytics data." },
      { status: 500 }
    );
  }
}
