import React from "react";
import { HomeClient } from "@/components/home-client";
import { getPlatformAnalytics, parseDateRange } from "@/lib/analytics";
import { ensureSeeded } from "@/lib/seed";
import type { AnalyticsPayload } from "@/components/impact-charts";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSeeded();
  const analytics = await getPlatformAnalytics(parseDateRange({ range: "all" }));

  const serialized: AnalyticsPayload = {
    ...analytics,
    recentActivity: analytics.recentActivity.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  return <HomeClient initialAnalytics={serialized} />;
}
