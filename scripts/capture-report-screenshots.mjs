import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.ECOTRACE_BASE_URL || "http://127.0.0.1:3000";
const developmentAccounts = JSON.parse(fs.readFileSync("config/development-accounts.json", "utf8"));
const OUT = path.join(process.cwd(), "public/reports/screenshots");
fs.mkdirSync(OUT, { recursive: true });
const errors = [];
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

async function pageFor(context, slug) {
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${slug}: ${error.message}`));
  return page;
}

async function capture(page, filename, fullPage = false) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, filename), fullPage, animations: "disabled" });
  console.log(`  Captured ${filename} · ${await page.title()}`);
}

async function authContext(accountId) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const account = developmentAccounts.accounts.find((item) => item.id === accountId);
  if (!account) throw new Error(`Missing development account: ${accountId}`);
  const res = await context.request.post(`${BASE}/api/auth/login`, { data: { email: account.email, password: developmentAccounts.sharedPassword } });
  if (!res.ok()) throw new Error(`Manual login failed for ${accountId}: ${res.status()}`);
  return context;
}

try {
  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await pageFor(publicContext, "public");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Your E-Waste/ }).first().waitFor();
  await capture(page, "01-homepage-hero.png");
  await page.getByRole("heading", { name: /Your old devices still have/ }).scrollIntoViewIfNeeded();
  await capture(page, "02-homepage-product-studio.png");
  await page.getByRole("heading", { name: /Discover the potential in/ }).scrollIntoViewIfNeeded();
  await page.locator("#sim-category").selectOption("Laptops");
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await capture(page, "22-interactive-device-explorer.png");
  await page.getByRole("button", { name: "Search site and actions" }).click();
  await page.getByLabel("Search commands").fill("phagwara");
  await page.getByRole("button", { name: /Punjab collection hubs/ }).waitFor();
  await capture(page, "23-command-palette-search.png");
  await page.keyboard.press("Escape");
  await page.goto(`${BASE}/journey/tablet`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /From an old tablet/ }).waitFor();
  await capture(page, "24-tablet-complete-journey.png");
  await page.getByRole("button", { name: "Replay the journey" }).click();
  await page.getByText(/STAGE 01 \/ 13/).waitFor();
  await capture(page, "25-tablet-journey-replay.png");
  await page.goto(`${BASE}/dashboards`, { waitUntil: "networkidle" });
  await page.getByText("Role portals, protected by login.").waitFor();
  await capture(page, "28-dashboard-access-hub.png");
  await page.goto(`${BASE}/marketplace`, { waitUntil: "networkidle" });
  await capture(page, "03-marketplace-landing.png");
  await page.getByRole("heading", { name: /Customer stories/ }).scrollIntoViewIfNeeded();
  await capture(page, "04-marketplace-demo-products.png");
  await page.goto(`${BASE}/collection-centers`, { waitUntil: "networkidle" });
  await page.getByText("EcoTrace Amritsar Circular Collection Studio").first().waitFor();
  await capture(page, "05-punjab-centers-map.png");
  await page.getByText("Punjab Pilot / Detailed Hub Map").scrollIntoViewIfNeeded();
  await capture(page, "20-punjab-interactive-map-detail.png");
  await page.getByRole("button", { name: "Phagwara", exact: true }).click();
  await page.getByText("EcoTrace Phagwara Community Drop-Off").first().waitFor();
  await capture(page, "06-phagwara-city-filter.png");
  await page.goto(`${BASE}/impact`, { waitUntil: "networkidle" });
  await capture(page, "07-live-impact-dashboard.png");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open multilingual assistant" }).click();
  await page.getByLabel("Chat language").selectOption("pa");
  await page.getByLabel("Chat message").fill("ਮੈਨੂੰ ਪੈਸੇ ਕਦੋਂ ਮਿਲਣਗੇ?");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByText(/Live OpenRouter AI|Private\/local guided answer/).last().waitFor({ timeout: 55000 });
  await capture(page, "08-tara-punjabi-chatbot.png");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await capture(page, "09-login-role-demo.png");
  await page.goto(`${BASE}/dashboard/admin`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/login\?redirect=/, { timeout: 20_000 });
  const adminCredentials = developmentAccounts.accounts.find((item) => item.id === "admin");
  await page.locator('input[type="email"]').fill(adminCredentials.email);
  await page.locator('input[type="password"]').fill(developmentAccounts.sharedPassword);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.getByRole("heading", { name: "Admin Sustainability Command Center" }).waitFor();
  await capture(page, "31-admin-login-redirect.png");
  await publicContext.close();

  const tabletContext = await authContext("phagwara_customer");
  const tabletPage = await pageFor(tabletContext, "tablet-customer");
  await tabletPage.goto(`${BASE}/journey/tablet`, { waitUntil: "networkidle" });
  const tabletLedger = await (await tabletContext.request.get(`${BASE}/api/payouts`)).json();
  const tabletCredit = tabletLedger.payouts.find((item) => item.statementCode === "STMT-PGW-TABLET-01");
  await tabletPage.goto(`${BASE}/statement/${tabletCredit.id}`, { waitUntil: "networkidle" });
  await tabletPage.getByText("STMT-PGW-TABLET-01").first().waitFor();
  await capture(tabletPage, "26-tablet-customer-bill.png");
  await tabletPage.goto(`${BASE}/dashboard/citizen?tab=marketplace`, { waitUntil: "networkidle" });
  await tabletPage.getByText("LIST-PGW-TABLET-01").first().waitFor();
  await capture(tabletPage, "27-phagwara-customer-wallet.png");
  await tabletContext.close();

  const citizenContext = await authContext("citizen");
  const citizen = await pageFor(citizenContext, "citizen");
  await citizen.goto(`${BASE}/dashboard/citizen`, { waitUntil: "networkidle" });
  await citizen.getByText("My E-Waste Collection Requests & Recycling Progress").waitFor();
  await capture(citizen, "10-citizen-overview.png");
  await citizen.getByRole("button", { name: "My Products & Wallet" }).first().click();
  await citizen.getByText("LIST-DEMO-1001").first().waitFor();
  await capture(citizen, "11-customer-products-wallet.png");
  await citizen.getByRole("button", { name: "List a product" }).click();
  await capture(citizen, "12-customer-create-listing.png");
  await citizen.getByRole("button", { name: "Close product form" }).click();
  await citizen.getByRole("button", { name: "AI Scan & Schedule Pickup" }).first().click();
  await citizen.getByRole("button", { name: "Try Multi-Device Sample" }).click();
  await citizen.getByRole("button", { name: "Identify E-Waste" }).click();
  await citizen.getByText(/Live Vision AI|Demo Mode · Live vision unavailable/).first().waitFor({ timeout: 60000 });
  await capture(citizen, "13-ai-multi-device-pickup.png");
  const ledger = await (await citizenContext.request.get(`${BASE}/api/payouts`)).json();
  const paid = ledger.payouts?.find((s) => s.status === "credited");
  if (paid) {
    const statement = await pageFor(citizenContext, "statement");
    await statement.goto(`${BASE}/statement/${paid.id}`, { waitUntil: "networkidle" });
    await capture(statement, "14-customer-demo-statement.png");
    await statement.getByText("Final sample wallet credit").scrollIntoViewIfNeeded();
    await capture(statement, "21-statement-amount-and-reference.png");
  }
  await citizenContext.close();

  const adminContext = await authContext("admin");
  const admin = await pageFor(adminContext, "admin");
  await admin.goto(`${BASE}/dashboard/admin`, { waitUntil: "networkidle" });
  await admin.getByText(/Collection & Recycling Trends/).waitFor();
  await capture(admin, "15-admin-analytics.png");
  await admin.getByRole("button", { name: "Products & Settlements" }).click();
  await admin.getByText("Settlement statements & approval queue").waitFor();
  await capture(admin, "16-admin-settlement-control.png");
  await adminContext.close();

  const recyclerContext = await authContext("recycler");
  const recycler = await pageFor(recyclerContext, "recycler");
  await recycler.goto(`${BASE}/dashboard/recycler`, { waitUntil: "networkidle" });
  await recycler.getByText("Recycler Operations Dashboard").first().waitFor();
  await capture(recycler, "17-recycler-batches.png");
  await recyclerContext.close();

  const partnerContext = await authContext("partner");
  const partner = await pageFor(partnerContext, "partner");
  await partner.goto(`${BASE}/dashboard/partner`, { waitUntil: "networkidle" });
  await capture(partner, "18-collection-partner-portal.png");
  await partnerContext.close();

  const organizationContext = await authContext("organization");
  const organization = await pageFor(organizationContext, "organization");
  await organization.goto(`${BASE}/dashboard/organization`, { waitUntil: "networkidle" });
  await organization.getByText("Organization & Producer EPR Portal").first().waitFor();
  await capture(organization, "29-organization-portal.png");
  await organizationContext.close();

  const centerContext = await authContext("center_manager");
  const center = await pageFor(centerContext, "center-manager");
  await center.goto(`${BASE}/dashboard/center`, { waitUntil: "networkidle" });
  await center.getByText("Collection Center Manager Portal").first().waitFor();
  await capture(center, "30-center-manager-portal.png");
  await centerContext.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const mobile = await pageFor(mobileContext, "mobile");
  await mobile.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await mobile.getByRole("heading", { name: /Your E-Waste/ }).first().waitFor();
  await capture(mobile, "19-responsive-mobile-home.png");
  await mobileContext.close();

  if (errors.length) console.warn(`Runtime browser page errors (${errors.length}):`, errors.slice(0, 15));
  else console.log("  No uncaught browser JavaScript errors detected.");
  console.log(`\nSaved ${fs.readdirSync(OUT).filter((f) => f.endsWith(".png")).length} authentic screenshots to ${OUT}`);
} finally {
  await browser.close();
}
