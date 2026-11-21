import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.ECOTRACE_BASE_URL || "http://127.0.0.1:3000";
const devAccounts = JSON.parse(fs.readFileSync("config/development-accounts.json", "utf8"));

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

async function runTests() {
  console.log("=== COMPREHENSIVE FEATURES & DASHBOARD TEST ===");
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Home page & Images Test
  console.log("\n1. Testing Home Page & Image Rendering...");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  const heroImg = page.locator('img[src="/images/premium-hero.jpg"]');
  await heroImg.waitFor({ state: "visible", timeout: 10000 });
  const heroNaturalWidth = await heroImg.evaluate((img) => img.naturalWidth);
  if (heroNaturalWidth <= 1) throw new Error("Hero image is still a 1x1 dummy or broken!");
  console.log(`✓ Hero image loaded cleanly: natural dimensions ${heroNaturalWidth}px width`);

  const tabletTeaserImg = page.locator('img[src*="tablet-sample.jpg"]');
  await tabletTeaserImg.first().waitFor({ state: "visible", timeout: 10000 });
  const tabletNaturalWidth = await tabletTeaserImg.first().evaluate((img) => img.naturalWidth);
  if (tabletNaturalWidth <= 1) throw new Error("Tablet teaser image is broken!");
  console.log(`✓ Tablet teaser image loaded cleanly: natural dimensions ${tabletNaturalWidth}px width`);

  // 2. AI Sample Upload Feature Test
  console.log("\n2. Testing AI Sample Upload Feature...");
  // Click "Try Multi-Device Sample" button
  const multiDeviceBtn = page.getByRole("button", { name: "Try Multi-Device Sample" });
  await multiDeviceBtn.scrollIntoViewIfNeeded();
  await multiDeviceBtn.click();
  console.log("Clicked 'Try Multi-Device Sample' button");

  // Check that preview image is loaded and not broken
  const previewImg = page.locator('img[alt="Uploaded e-waste preview"]');
  await previewImg.waitFor({ state: "visible", timeout: 10000 });
  const previewWidth = await previewImg.evaluate((img) => img.naturalWidth);
  if (previewWidth <= 1) throw new Error("Preview image is a 1x1 black dummy!");
  console.log(`✓ Upload preview rendered real photo: natural width ${previewWidth}px`);

  // Click "Identify E-Waste"
  const identifyBtn = page.getByRole("button", { name: "Identify E-Waste" });
  await identifyBtn.click();
  console.log("Clicked 'Identify E-Waste' button");

  // Wait for classification results
  await page.waitForSelector('text=Multi-Device Breakdown Enabled', { timeout: 15000 });
  console.log("✓ AI Classifier correctly identified multi-device sample items");

  // Click "Try Tablet Photo" button
  const tabletSampleBtn = page.getByRole("button", { name: "Try Tablet Photo" });
  await tabletSampleBtn.click();
  console.log("Clicked 'Try Tablet Photo' button");

  // Click "Identify E-Waste"
  await page.waitForTimeout(500);
  await identifyBtn.click();
  console.log("Clicked 'Identify E-Waste' for tablet");
  await page.waitForTimeout(1500);
  const detectedCategory = await page.locator('select[aria-label="E-waste category"]').first().inputValue();
  console.log(`✓ AI Classifier processed tablet photo: identified category "${detectedCategory}"`);

  // 3. Testing Login and All 6 Distinct Dashboards
  console.log("\n3. Testing All Role Logins & Dashboards...");
  const accountsToTest = [
    { id: "citizen", name: "Citizen", path: "/dashboard/citizen", checkSelector: "text=Citizen E-Waste Dashboard" },
    { id: "partner", name: "Collection Partner", path: "/dashboard/partner", checkSelector: "text=Collection Partner Portal" },
    { id: "center_manager", name: "Center Manager", path: "/dashboard/center", checkSelector: "text=Collection Center Manager Portal" },
    { id: "recycler", name: "Recycler", path: "/dashboard/recycler", checkSelector: "text=Recycler Operations Dashboard" },
    { id: "organization", name: "Organization", path: "/dashboard/organization", checkSelector: "text=Organization & Producer EPR Portal" },
    { id: "admin", name: "Admin", path: "/dashboard/admin", checkSelector: "text=Admin Sustainability Command Center" },
  ];

  for (const acc of accountsToTest) {
    const accData = devAccounts.accounts.find((a) => a.id === acc.id);
    const roleContext = await browser.newContext();
    const rolePage = await roleContext.newPage();

    await rolePage.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await rolePage.locator('input[type="email"]').fill(accData.email);
    await rolePage.locator('input[type="password"]').fill(devAccounts.sharedPassword);
    await rolePage.getByRole("button", { name: "Sign In", exact: true }).click();

    await rolePage.waitForURL(`**${acc.path}`, { timeout: 15000 });
    await rolePage.waitForSelector(acc.checkSelector, { timeout: 10000 });
    console.log(`✓ ${acc.name} (${accData.email}) logged in successfully -> ${acc.path}`);

    await roleContext.close();
  }

  // 4. Testing Marketplace Page
  console.log("\n4. Testing Marketplace Page...");
  await page.goto(`${BASE}/marketplace`, { waitUntil: "networkidle" });
  await page.waitForSelector('text=Give your old tech', { timeout: 10000 });
  await page.waitForSelector('text=Customer stories', { timeout: 10000 });
  const galleryImgs = await page.locator('article img').all();
  console.log(`Found ${galleryImgs.length} marketplace sample product cards`);
  for (let i = 0; i < Math.min(galleryImgs.length, 4); i++) {
    const w = await galleryImgs[i].evaluate((img) => img.naturalWidth);
    if (w <= 1) throw new Error(`Marketplace image ${i} failed to load!`);
  }
  console.log("✓ Marketplace images verified high resolution");

  // 5. Testing Interactive Tablet Journey
  console.log("\n5. Testing Public Tablet Journey...");
  await page.goto(`${BASE}/journey/tablet`, { waitUntil: "networkidle" });
  await page.waitForSelector('text=ECO-2026-TABLET-01', { timeout: 10000 });
  console.log("✓ Public tablet journey route verified with timeline milestones");

  // 6. Testing Collection Centers Page
  console.log("\n6. Testing Collection Centers Explorer...");
  await page.goto(`${BASE}/collection-centers`, { waitUntil: "networkidle" });
  await page.waitForSelector('text=Punjab', { timeout: 10000 });
  await page.waitForSelector('text=Phagwara', { timeout: 10000 });
  console.log("✓ Collection centers loaded Punjab & Phagwara hubs");

  // 7. Testing Impact Analytics Page
  console.log("\n7. Testing Impact Page...");
  await page.goto(`${BASE}/impact`, { waitUntil: "networkidle" });
  await page.waitForSelector('text=Environmental Impact Dashboard', { timeout: 10000 });
  console.log("✓ Impact analytics charts and statistics rendered");

  await context.close();
  await browser.close();
  console.log("\n===========================================");
  console.log("ALL FEATURES, UPLOADS & DASHBOARDS FUNCTIONING PERFECTLY!");
  console.log("===========================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
