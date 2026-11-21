import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.ECOTRACE_BASE_URL || "http://127.0.0.1:3000";
const developmentAccounts = JSON.parse(fs.readFileSync("config/development-accounts.json", "utf8"));
const dir = path.join(process.cwd(), "public/reports/videos");
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, recordVideo: { dir, size: { width: 1280, height: 720 } } });
const page = await context.newPage();
const video = page.video();
try {
  await page.goto(`${BASE}/journey/tablet`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /From an old tablet/ }).waitFor();
  await page.waitForTimeout(1700);
  await page.getByText(/STAGE 13 \/ 13/).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1300);
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await page.waitForTimeout(15_000);
  await page.getByText("Everything reconciled.").scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  await page.getByRole("link", { name: /Sign in to view customer bill/ }).click();
  await page.waitForURL(/\/login\?redirect=/, { timeout: 20_000 });
  const owner = developmentAccounts.accounts.find((entry) => entry.id === "phagwara_customer");
  await page.locator('input[type="email"]').fill(owner.email);
  await page.locator('input[type="password"]').fill(developmentAccounts.sharedPassword);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.waitForURL(/\/statement\/\d+/, { timeout: 20_000 });
  await page.getByText("STMT-PGW-TABLET-01").first().waitFor();
  await page.waitForTimeout(1800);
  await page.getByText("Final sample wallet credit").scrollIntoViewIfNeeded();
  await page.waitForTimeout(2700);
  await page.goto(`${BASE}/dashboard/citizen?tab=marketplace`, { waitUntil: "networkidle" });
  await page.getByText("LIST-PGW-TABLET-01").first().waitFor();
  await page.waitForTimeout(2500);
  await page.getByText("LIST-PGW-TABLET-01").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  console.log("Recorded real tablet listing → recycler documentation → sample bill → customer wallet journey.");
} finally {
  await context.close();
  await browser.close();
}
const videoPath = await video?.path();
if (!videoPath) throw new Error("Browser did not produce a video.");
const finalPath = path.join(process.cwd(), "public/reports/EcoTrace-Tablet-Journey-Walkthrough.webm");
fs.copyFileSync(videoPath, finalPath);
console.log(`Saved ${finalPath} (${(fs.statSync(finalPath).size / 1024 / 1024).toFixed(1)} MB)`);
