import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.ECOTRACE_BASE_URL || "http://127.0.0.1:3000";
const developmentAccounts = JSON.parse(fs.readFileSync("config/development-accounts.json", "utf8"));
const roles = [
  { id: "citizen", path: "/dashboard/citizen", heading: "Citizen E-Waste Dashboard" },
  { id: "partner", path: "/dashboard/partner", heading: "Collection Partner Portal" },
  { id: "center_manager", path: "/dashboard/center", heading: "Collection Center Manager Portal" },
  { id: "recycler", path: "/dashboard/recycler", heading: "Recycler Operations Dashboard" },
  { id: "organization", path: "/dashboard/organization", heading: "Organization & Producer EPR Portal" },
  { id: "admin", path: "/dashboard/admin", heading: "Admin Sustainability Command Center" },
];
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const errors = [];
let checks = 0;
function verify(ok, label) { if (!ok) throw new Error(label); checks++; console.log(`✓ ${label}`); }
function account(id) { const entry = developmentAccounts.accounts.find((a) => a.id === id); if (!entry) throw new Error(`Missing development account: ${id}`); return entry; }
async function signIn(page, id) {
  await page.locator('input[type="email"]').fill(account(id).email);
  await page.locator('input[type="password"]').fill(developmentAccounts.sharedPassword);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
}

try {
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`${role.id}: ${error.message}`));
    await page.goto(`${BASE}/dashboards`, { waitUntil: "networkidle" });
    verify(!(await page.locator("body").innerText()).includes(developmentAccounts.sharedPassword), "Public portal directory hides development password");
    await page.getByRole("link", { name: "Sign in to open", exact: true }).nth(i).click();
    await page.waitForURL(/\/login\?redirect=/, { timeout: 20_000 });
    verify(true, `${role.id} portal requires the login form`);
    await signIn(page, role.id);
    await page.waitForURL(`**${role.path}`, { timeout: 20_000 });
    await page.getByRole("heading", { name: role.heading, exact: true }).first().waitFor({ timeout: 20_000 });
    verify(true, `${role.id} credentials open the correct dashboard`);
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("heading", { name: role.heading, exact: true }).first().waitFor({ timeout: 20_000 });
    verify(true, `${role.id} session persists after refresh`);
    const me = await (await context.request.get(`${BASE}/api/auth/me`)).json();
    verify(me.user?.role === account(role.id).role, `${role.id} role is verified on the server`);
    if (role.id === "citizen") {
      verify((await context.request.get(`${BASE}/api/admin/users`)).status() === 403, "Citizen cannot access admin data");
      await page.goto(`${BASE}/dashboard/recycler`, { waitUntil: "networkidle" });
      await page.waitForURL(/\/login\?redirect=/, { timeout: 20_000 });
      verify(true, "Wrong-role Recycler visit redirects to login rather than a dead-end page");
      await signIn(page, "recycler");
      await page.waitForURL("**/dashboard/recycler", { timeout: 20_000 });
      verify(true, "Recycler credentials replace the citizen session and open Recycler portal");
    }
    await context.close();
  }

  const guest = await browser.newContext({ viewport: { width: 1250, height: 850 } });
  const page = await guest.newPage();
  page.on("pageerror", (error) => errors.push(`tablet: ${error.message}`));
  await page.goto(`${BASE}/journey/tablet`, { waitUntil: "networkidle" });
  verify((await page.getByText(/Sample wallet credited/).count()) >= 1, "Public tablet journey shows simulated credit");
  await page.getByRole("link", { name: /Sign in to view customer bill/ }).click();
  await page.waitForURL(/\/login\?redirect=/, { timeout: 20_000 });
  await signIn(page, "phagwara_customer");
  await page.waitForURL(/\/statement\/\d+/, { timeout: 20_000 });
  await page.getByText("STMT-PGW-TABLET-01").first().waitFor({ timeout: 20_000 });
  verify(true, "Owner credentials unlock the private tablet statement");
  const statement = await page.locator("body").innerText();
  verify(statement.includes("₹750") && statement.includes("SAMPLE SETTLEMENT STATEMENT"), "Tablet statement shows sample credit and accurate notice");
  await page.goto(`${BASE}/dashboard/citizen?tab=marketplace`, { waitUntil: "networkidle" });
  await page.getByText("LIST-PGW-TABLET-01").first().waitFor({ timeout: 20_000 });
  verify(true, "Phagwara customer sees paid tablet listing and wallet");
  await guest.close();

  const direct = await browser.newContext({ viewport: { width: 1150, height: 820 } });
  const restricted = await direct.newPage();
  await restricted.goto(`${BASE}/dashboard/recycler`, { waitUntil: "networkidle" });
  await restricted.waitForURL(/\/login\?redirect=/, { timeout: 20_000 });
  verify(true, "Direct protected Recycler link automatically redirects to login");
  await signIn(restricted, "recycler");
  await restricted.waitForURL("**/dashboard/recycler", { timeout: 20_000 });
  await restricted.getByRole("heading", { name: "Recycler Operations Dashboard" }).first().waitFor();
  verify(true, "Direct Recycler login restores the originally requested dashboard");
  await direct.close();
  verify(errors.length === 0, "No uncaught browser errors across protected portals");
  console.log(`\nBROWSER RESULT: ${checks}/${checks} checks passed`);
} finally { await browser.close(); }
