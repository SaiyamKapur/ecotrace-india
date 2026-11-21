import "server-only";
import fs from "fs";
import path from "path";
import type { UserRole } from "@/db/schema";
import exampleAccounts from "../../config/development-accounts.example.json";

interface AccountsConfig {
  sharedPassword?: string;
  accounts: Array<{
    id: string;
    role: UserRole;
    email: string;
    dashboard: string;
  }>;
}

function loadAccounts(): AccountsConfig {
  try {
    const filePath = path.join(process.cwd(), "config", "development-accounts.json");
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch {
    // ignore
  }
  return exampleAccounts as AccountsConfig;
}

const config = loadAccounts();

export const SAMPLE_ACCOUNT_CREDENTIALS = config.accounts as ReadonlyArray<{
  id: string;
  role: UserRole;
  email: string;
  dashboard: string;
}>;

export function sampleAccountPassword(): string {
  return (
    process.env.ECOTRACE_SAMPLE_PASSWORD ||
    (config.sharedPassword &&
    config.sharedPassword !== "REPLACE_WITH_LOCAL_DEVELOPMENT_PASSWORD"
      ? config.sharedPassword
      : "Password@123")
  );
}
