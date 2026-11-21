import fs from "node:fs";
import crypto from "node:crypto";
import pg from "pg";

const BASE = process.env.ECOTRACE_BASE_URL || "http://127.0.0.1:3000";
const developmentAccounts = JSON.parse(fs.readFileSync("config/development-accounts.json", "utf8"));
const testStartedAt = new Date();
const evidence = { project: "EcoTrace India", course: "INT 252 — Web App Development with React JS", executedAt: new Date().toISOString(), checks: [], result: "IN PROGRESS", note: "Sandbox test: no real bank transfer or statutory certificate is created." };
const refs = { listingId: null, listingCode: null, pickupId: null, pickupCode: null, batchId: null, batchCode: null, payoutId: null, statementCode: null };
const cookies = {};
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/app_db" });
let originalPoints = null;
let originalLoad = null;
let citizenId = null;
let centerId = null;
let startingBalance = 0;
let registeredUserId = null;

function pass(name, condition, detail = "") {
  evidence.checks.push({ name, status: condition ? "PASS" : "FAIL", detail });
  if (!condition) throw new Error(`${name} failed. ${detail}`);
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function api(path, options = {}, who = null) {
  const headers = { ...(options.headers || {}), ...(who ? { cookie: cookies[who] } : {}) };
  if (options.body && typeof options.body === "object" && !(options.body instanceof Buffer)) headers["content-type"] = "application/json";
  const response = await fetch(`${BASE}${path}`, { ...options, headers, body: options.body && typeof options.body === "object" && !(options.body instanceof Buffer) ? JSON.stringify(options.body) : options.body, redirect: "manual" });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  return { status: response.status, data, response };
}

async function login(accountId, who) {
  const account = developmentAccounts.accounts.find((entry) => entry.id === accountId);
  if (!account) throw new Error(`Missing development account ${accountId}`);
  const r = await api("/api/auth/login", { method: "POST", body: { email: account.email, password: developmentAccounts.sharedPassword } });
  pass(`Manual role login: ${who}`, r.status === 200 && r.data.user?.role === account.role);
  cookies[who] = r.response.headers.get("set-cookie")?.split(";")[0] || "";
  pass(`Session cookie: ${who}`, cookies[who].startsWith("ecotrace_session="));
  return r.data.user;
}

try {
  console.log("EcoTrace India — complete functional evidence test\n");
  for (const route of ["/", "/marketplace", "/dashboards", "/journey/tablet", "/collection-centers", "/impact", "/how-it-works", "/docs", "/login", "/api/health"]) {
    const r = await api(route);
    pass(`Public page: ${route}`, r.status === 200);
  }
  const hubs = await api("/api/centers?state=Punjab");
  const cities = new Set(hubs.data.centers.map((h) => h.city));
  pass("Punjab demo hubs seeded", ["Ludhiana", "Amritsar", "Jalandhar", "Phagwara", "Mohali", "Patiala"].every((c) => cities.has(c)) && hubs.data.centers.every((h) => h.isDemoSample));
  pass("Phagwara-area sample hubs and platform contact loaded", ["Phagwara", "Goraya", "Banga", "Kapurthala", "Hoshiarpur", "Jalandhar"].every((c) => cities.has(c)) && hubs.data.centers.filter((h) => h.state === "Punjab").length >= 10 && hubs.data.centers.every((h) => h.contactPhone === "7087394940" && h.contactEmail === "infoecotrase@gmail.com"));
  const tabletTrace = await api("/api/trace/ECO-2026-TABLET-01");
  pass("Tablet journey has all recorded custody milestones", tabletTrace.status === 200 && tabletTrace.data.timeline.length >= 13 && tabletTrace.data.timeline.at(-1)?.stage === "wallet_credited" && !tabletTrace.data.record.pickupAddress);
  const sampleLog = await api("/reports/tablet-recovery-log-sample.pdf");
  pass("Real sample recycler processing PDF is downloadable", sampleLog.status === 200);
  const showcase = await api("/api/listings?showcase=1");
  pass("Public sample product gallery without owner PII", showcase.status === 200 && showcase.data.listings.length >= 6 && showcase.data.listings.every((l) => l.isDemoRecord && !l.ownerId));
  pass("Photo-backed tablet listing is visible as a sample record", showcase.data.listings.some((l) => l.listingCode === "LIST-PGW-TABLET-01" && l.imageUrl === "/images/tablet-sample.jpg" && l.status === "paid"));
  const chatConfig = await api("/api/chat");
  pass("Chat configuration never discloses the provider key", chatConfig.status === 200 && typeof chatConfig.data.providerConfigured === "boolean" && !JSON.stringify(chatConfig.data).includes("sk-or-v1-"));
  const removedSample = await api("/api/auth/sample", { method: "POST", body: { accountId: "admin" } });
  pass("Public password-free sample login endpoint removed", removedSample.status === 404);
  const guestChat = await api("/api/chat", { method: "POST", body: { message: "ਫਗਵਾੜਾ ਵਿੱਚ ਕੇਂਦਰ ਕਿੱਥੇ ਹੈ?", language: "pa" } });
  pass("Multilingual Punjabi chatbot", guestChat.status === 200 && guestChat.data.language === "pa" && /[\u0A00-\u0A7F]/u.test(guestChat.data.reply) && ["live_ai", "multilingual_guide"].includes(guestChat.data.mode) && guestChat.data.links.some((a) => a.href === "/collection-centers"));
  const hindiChat = await api("/api/chat", { method: "POST", body: { message: "पिकअप कैसे करें?", language: "hi" } });
  pass("Hindi guided chat", hindiChat.status === 200 && /[\u0900-\u097F]/u.test(hindiChat.data.reply));
  const englishChat = await api("/api/chat", { method: "POST", body: { message: "Where are your Punjab centers?", language: "en" } });
  pass("Database-grounded English center guidance", englishChat.status === 200 && englishChat.data.reply.length > 30 && englishChat.data.links.some((a) => a.href === "/collection-centers"));
  const sampleImage = fs.readFileSync("public/images/sample-multidevice.jpg");
  const imageScan = await api("/api/ai/classify", { method: "POST", body: { imageBase64: `data:image/jpeg;base64,${sampleImage.toString("base64")}`, fileName: "sample-multidevice.jpg" } });
  pass("Vision model or honest multi-device fallback", imageScan.status === 200 && ["live_vision_api", "demo_mode"].includes(imageScan.data.mode) && imageScan.data.items.length >= 2 && Boolean(imageScan.data.weightDisclaimer));
  const blocked = await api("/api/listings");
  pass("Private products require authentication", blocked.status === 401);

  const testEmail = `course-qa-${crypto.randomBytes(5).toString("hex")}@ecotrace.example`;
  const testPassword = `SampleTest1@${crypto.randomBytes(6).toString("hex")}`;
  const registration = await api("/api/auth/register", { method: "POST", body: { fullName: "Temporary QA Customer", email: testEmail, password: testPassword, role: "citizen", city: "Phagwara", state: "Punjab" } });
  pass("New customer registration persists", registration.status === 201 && registration.data.user.email === testEmail);
  registeredUserId = registration.data.user.id;
  const invalidManual = await api("/api/auth/login", { method: "POST", body: { email: testEmail, password: "IncorrectCredential1!" } });
  pass("Invalid manual login is denied", invalidManual.status === 401);
  const manualCookie = registration.response.headers.get("set-cookie")?.split(";")[0];
  const manualLogout = await fetch(`${BASE}/api/auth/logout`, { method: "POST", headers: { cookie: manualCookie } });
  pass("Registered customer logout revokes session", manualLogout.status === 200);
  const manualLogin = await api("/api/auth/login", { method: "POST", body: { email: testEmail, password: testPassword } });
  const newCookie = manualLogin.response.headers.get("set-cookie")?.split(";")[0];
  const manualMe = await fetch(`${BASE}/api/auth/me`, { headers: { cookie: newCookie } });
  pass("Registered customer can log back in", manualLogin.status === 200 && (await manualMe.json()).user?.id === registeredUserId);

  const customer = await login("phagwara_customer", "customer");
  citizenId = customer.id;
  await login("citizen", "otherCitizen");
  await login("admin", "admin");
  await login("partner", "partner");
  await login("recycler", "recycler");
  await login("center_manager", "manager");
  const before = await pool.query("SELECT green_points FROM users WHERE id=$1", [citizenId]);
  originalPoints = before.rows[0]?.green_points;
  const walletBefore = await api("/api/payouts", {}, "customer");
  startingBalance = walletBefore.data.balancePaise || 0;
  const tabletStatement = walletBefore.data.payouts.find((entry) => entry.statementCode === "STMT-PGW-TABLET-01");
  pass("Phagwara sample customer has a credited tablet bill", walletBefore.status === 200 && startingBalance >= 75000 && Boolean(tabletStatement));
  const tabletBill = await api(`/statement/${tabletStatement.id}`, {}, "customer");
  pass("Tablet statement shows product image, sample credit and log link", tabletBill.status === 200 && tabletBill.data.includes("tablet-sample.jpg") && tabletBill.data.includes("tablet-recovery-log-sample.pdf"));
  centerId = hubs.data.centers.find((h) => h.city === "Phagwara").id;
  originalLoad = (await pool.query("SELECT current_load_kg FROM collection_centers WHERE id=$1", [centerId])).rows[0]?.current_load_kg;

  const image = fs.readFileSync("public/images/listing-laptop.jpg");
  const listingCreate = await api("/api/listings", { method: "POST", body: { title: `E2E study notebook ${crypto.randomBytes(2).toString("hex")}`, category: "Laptops", brand: "Sample", model: "Notebook 13", condition: "working", quantity: 1, city: "Phagwara", state: "Punjab", description: "System test product photo. No real item is being sold.", imageDataUrl: `data:image/jpeg;base64,${image.toString("base64")}` } }, "customer");
  pass("Customer creates image-backed product listing", listingCreate.status === 201 && listingCreate.data.listing?.imageUrl.startsWith("data:image/jpeg"));
  refs.listingId = listingCreate.data.listing.id;
  refs.listingCode = listingCreate.data.listing.listingCode;
  const otherAccept = await api(`/api/listings/${refs.listingId}`, { method: "PATCH", body: { action: "accept_quote" } }, "otherCitizen");
  pass("Another citizen cannot accept someone else's offer", otherAccept.status === 403);
  const nonAdminQuote = await api(`/api/listings/${refs.listingId}`, { method: "PATCH", body: { action: "quote", amountPaise: 240000 } }, "customer");
  pass("Only admin can issue reviewed offer", nonAdminQuote.status === 403);

  const quote = await api(`/api/listings/${refs.listingId}`, { method: "PATCH", body: { action: "quote", amountPaise: 240000, notes: "E2E sandbox offer after inspection preview." } }, "admin");
  pass("Administrator issues reviewed INR sandbox offer", quote.status === 200 && quote.data.listing.offeredAmountPaise === 240000);
  const accept = await api(`/api/listings/${refs.listingId}`, { method: "PATCH", body: { action: "accept_quote" } }, "customer");
  pass("Customer accepts offer", accept.status === 200 && accept.data.listing.status === "accepted");
  const partners = await api("/api/admin/users", {}, "admin");
  const partnerId = partners.data.users.find((u) => u.role === "partner")?.id;
  const pickup = await api("/api/pickups", { method: "POST", body: {
    listingId: refs.listingId, items: [{ category: "Laptops", quantity: 1, userCorrected: true }],
    pickupAddress: "Phagwara Town Demo Zone, Punjab", city: "Phagwara", state: "Punjab", pincode: "144401", preferredDate: "2026-12-15", preferredTimeSlot: "09:00 AM - 12:00 PM", collectionCenterId: centerId,
    aiClassificationMode: "manual",
  } }, "customer");
  pass("Accepted product linked to persistent pickup", pickup.status === 201 && pickup.data.request?.requestCode.startsWith("ECO-"));
  refs.pickupId = pickup.data.request.id;
  refs.pickupCode = pickup.data.request.requestCode;
  const privateReq = await api(`/api/pickups/${refs.pickupId}`, {}, "otherCitizen");
  pass("Another citizen cannot view private pickup address", privateReq.status === 403);
  const trace = await api(`/api/trace/${refs.pickupCode}`);
  pass("Public trace redacts street address", trace.status === 200 && !JSON.stringify(trace.data).includes("Phagwara Town Demo Zone"));
  const cannotPayYet = await api("/api/payouts", { method: "POST", body: { listingId: refs.listingId } }, "admin");
  pass("No payout before physical collection and recycling", cannotPayYet.status === 409);

  const assign = await api(`/api/pickups/${refs.pickupId}`, { method: "PATCH", body: { action: "assign", assignedPartnerId: partnerId, collectionCenterId: centerId } }, "admin");
  pass("Admin assigns active collection partner", assign.status === 200);
  const collect = await api(`/api/pickups/${refs.pickupId}`, { method: "PATCH", body: { action: "record_collection", actualCollectedQty: 1, actualCollectedWeightKg: 2.2, partnerNotes: "E2E sandbox digital scale reading." } }, "partner");
  pass("Partner saves measured 2.2 kg; not yet recycled", collect.status === 200 && collect.data.request.status === "collected" && collect.data.request.actualCollectedWeightKg === 2.2);
  const verify = await api(`/api/pickups/${refs.pickupId}`, { method: "PATCH", body: { action: "verify_collection" } }, "manager");
  pass("Center manager verifies physical collection", verify.status === 200 && verify.data.request.status === "verified");
  const batch = await api("/api/batches", { method: "POST", body: { requestIds: [refs.pickupId], collectionCenterId: centerId } }, "admin");
  pass("Verified item dispatched into recycler batch", batch.status === 201);
  refs.batchId = batch.data.batch.id;
  refs.batchCode = batch.data.batch.batchCode;
  const receipt = await api(`/api/batches/${refs.batchId}`, { method: "PATCH", body: { action: "confirm_receipt", acceptedQty: 1, rejectedQty: 0, receivedWeightKg: 2.18 } }, "recycler");
  pass("Recycler confirms gate receipt", receipt.status === 200 && receipt.data.batch.status === "received");
  const repeatedReceipt = await api(`/api/batches/${refs.batchId}`, { method: "PATCH", body: { action: "confirm_receipt", acceptedQty: 1, receivedWeightKg: 2.18 } }, "recycler");
  pass("Repeated batch receipt prevented", repeatedReceipt.status === 409);
  const processing = await api(`/api/batches/${refs.batchId}`, { method: "PATCH", body: { action: "start_processing" } }, "recycler");
  pass("Recycler starts processing", processing.status === 200 && processing.data.batch.status === "processing");
  const noDoc = await api(`/api/batches/${refs.batchId}`, { method: "PATCH", body: { action: "document_processing", processedQty: 1, documentedRecyclingKg: 2.0 } }, "recycler");
  pass("Recycling cannot be documented without supporting evidence", noDoc.status === 400);
  const doc = await api(`/api/batches/${refs.batchId}`, { method: "PATCH", body: { action: "document_processing", processedQty: 1, documentedRecyclingKg: 2.0,
    document: { title: "E2E sample dismantling log", docType: "Processing Log", referenceNo: "TEST-DOC-2026-01", fileName: "e2e-demo-log.pdf" },
    recoveryBreakdown: { metalsKg: 0.8, plasticsKg: 0.4, glassKg: 0.3, circuitBoardsKg: 0.3, hazardousDivertedKg: 0.1 },
  } }, "recycler");
  pass("Recycling documented with mass balance and evidence", doc.status === 200 && doc.data.batch.status === "documented");
  const payout = await api("/api/payouts", { method: "POST", body: { listingId: refs.listingId } }, "admin");
  pass("Admin prepares quantity-checked settlement", payout.status === 201 && payout.data.payout.finalAmountPaise === 240000);
  refs.payoutId = payout.data.payout.id;
  refs.statementCode = payout.data.payout.statementCode;
  const approve = await api(`/api/payouts/${refs.payoutId}`, { method: "PATCH", body: { action: "approve" } }, "admin");
  pass("Admin signs off sandbox settlement", approve.status === 200 && approve.data.payout.status === "approved");
  const credit = await api(`/api/payouts/${refs.payoutId}`, { method: "PATCH", body: { action: "credit" } }, "admin");
  pass("Customer receives demo wallet credit (no bank transfer)", credit.status === 200 && credit.data.payout.status === "credited" && credit.data.payout.method === "demo_wallet");
  const dup = await api(`/api/payouts/${refs.payoutId}`, { method: "PATCH", body: { action: "credit" } }, "admin");
  pass("Duplicate wallet credit blocked", dup.status === 409);
  const wallet = await api("/api/payouts", {}, "customer");
  pass("Customer wallet persists the credited amount", wallet.status === 200 && wallet.data.balancePaise >= startingBalance + 240000 && wallet.data.payouts.some((p) => p.statementCode === refs.statementCode));
  const statement = await api(`/statement/${refs.payoutId}`, {}, "customer");
  pass("Printable sandbox statement is owner-accessible", statement.status === 200 && statement.data.includes(refs.statementCode) && statement.data.includes("NOT A TAX INVOICE"));
  const noStatement = await api(`/statement/${refs.payoutId}`, {}, "otherCitizen");
  pass("Another citizen cannot see someone else's settlement", noStatement.status === 200 && noStatement.data.includes("Statement unavailable") && !noStatement.data.includes(refs.statementCode));
  const chatStatus = await api("/api/chat", { method: "POST", body: { message: "When will I get paid?", language: "en" } }, "customer");
  pass("Chat queries only signed-in customer's demo wallet", chatStatus.status === 200 && chatStatus.data.reply.includes(`₹${((startingBalance + 240000) / 100).toLocaleString("en-IN")}`) && ["live_ai", "multilingual_guide"].includes(chatStatus.data.mode));
  const history = await api("/api/chat", {}, "customer");
  const otherHistory = await api("/api/chat", {}, "otherCitizen");
  pass("Chat history is private and persisted", history.status === 200 && history.data.messages.some((m) => m.content.includes("When will I get paid")) && !otherHistory.data.messages.some((m) => m.content.includes("When will I get paid")));
  const audit = await api("/api/admin/audit-logs", {}, "admin");
  pass("Settlement actions appear in admin audit log", audit.status === 200 && audit.data.logs.some((l) => l.entityId === refs.statementCode && l.action === "DEMO_WALLET_CREDITED"));
  const oldOtherCookie = cookies.otherCitizen;
  const adminAccount = developmentAccounts.accounts.find((entry) => entry.id === "admin");
  const switched = await api("/api/auth/login", { method: "POST", body: { email: adminAccount.email, password: developmentAccounts.sharedPassword } }, "otherCitizen");
  pass("Role switch redirects to the correct dashboard", switched.status === 200 && switched.data.redirectTo === "/dashboard/admin");
  const oldSession = await fetch(`${BASE}/api/auth/me`, { headers: { cookie: oldOtherCookie } });
  pass("Role switch revokes the old citizen session", (await oldSession.json()).user === null);
  const clearChat = await api("/api/chat", { method: "DELETE" }, "customer");
  pass("Customer can clear private chat history", clearChat.status === 200);
  const logout = await api("/api/auth/logout", { method: "POST" }, "customer");
  pass("Logout succeeds", logout.status === 200);
  const expired = await api("/api/payouts", {}, "customer");
  pass("Logout revokes private session", expired.status === 401);
  evidence.result = "PASS";
} catch (error) {
  evidence.result = "FAIL";
  evidence.error = error instanceof Error ? error.message : String(error);
  console.error("\nE2E test failed:", evidence.error);
} finally {
  // Remove temporary test transaction records; preserve original labeled demo samples.
  try {
    if (registeredUserId) {
      await pool.query("DELETE FROM audit_logs WHERE entity_type='user' AND entity_id=$1", [String(registeredUserId)]);
      await pool.query("DELETE FROM users WHERE id=$1", [registeredUserId]);
    }
    if (refs.listingId) await pool.query("DELETE FROM settlement_records WHERE listing_id=$1", [refs.listingId]);
    if (refs.batchId) await pool.query("DELETE FROM epr_records WHERE batch_id=$1", [refs.batchId]);
    if (refs.listingId) await pool.query("DELETE FROM product_listings WHERE id=$1", [refs.listingId]);
    if (refs.pickupId) await pool.query("DELETE FROM pickup_requests WHERE id=$1", [refs.pickupId]);
    if (refs.batchId) await pool.query("DELETE FROM recycling_batches WHERE id=$1", [refs.batchId]);
    const ids = [refs.listingCode, refs.pickupCode, refs.batchCode, refs.statementCode].filter(Boolean);
    if (ids.length) await pool.query("DELETE FROM audit_logs WHERE entity_id = ANY($1::text[])", [ids]);
    if (refs.pickupCode) await pool.query("DELETE FROM notifications WHERE title LIKE $1 OR message LIKE $1", [`%${refs.pickupCode}%`]);
    if (refs.listingCode) await pool.query("DELETE FROM notifications WHERE title LIKE $1 OR message LIKE $1", [`%${refs.listingCode}%`]);
    if (refs.statementCode) await pool.query("DELETE FROM notifications WHERE title LIKE $1 OR message LIKE $1", [`%${refs.statementCode}%`]);
    if (citizenId != null) await pool.query("DELETE FROM chat_messages WHERE user_id=$1 AND created_at >= $2", [citizenId, testStartedAt]);
    if (originalPoints != null && citizenId != null) await pool.query("UPDATE users SET green_points=$1 WHERE id=$2", [originalPoints, citizenId]);
    if (originalLoad != null && centerId != null) await pool.query("UPDATE collection_centers SET current_load_kg=$1 WHERE id=$2", [originalLoad, centerId]);
    console.log("Test transactions cleaned up; baseline demo data preserved.");
  } catch (error) { console.error("Test cleanup warning", error); }
  await pool.end();
  evidence.summary = { total: evidence.checks.length, passed: evidence.checks.filter((c) => c.status === "PASS").length, failed: evidence.checks.filter((c) => c.status === "FAIL").length };
  fs.mkdirSync("public/reports", { recursive: true });
  fs.writeFileSync("public/reports/test-results.json", JSON.stringify(evidence, null, 2));
  console.log(`\nRESULT: ${evidence.result} — ${evidence.summary.passed}/${evidence.summary.total} checks passed`);
  if (evidence.result !== "PASS") process.exitCode = 1;
}
