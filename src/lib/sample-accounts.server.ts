import "server-only";
import type { UserRole } from "@/db/schema";
import developmentAccounts from "../../config/development-accounts.json";

/** The single source of development account IDs, roles, emails and password. */
export const SAMPLE_ACCOUNT_CREDENTIALS = developmentAccounts.accounts as ReadonlyArray<{
  id: string;
  role: UserRole;
  email: string;
  dashboard: string;
}>;

export function sampleAccountPassword(): string {
  return process.env.ECOTRACE_SAMPLE_PASSWORD || developmentAccounts.sharedPassword;
}
