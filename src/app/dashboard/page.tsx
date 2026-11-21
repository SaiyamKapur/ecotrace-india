import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_DASHBOARD_ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DashboardIndexPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  redirect(ROLE_DASHBOARD_ROUTES[user.role] || "/dashboard/citizen");
}
