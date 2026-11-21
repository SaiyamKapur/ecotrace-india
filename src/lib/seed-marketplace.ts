import { eq } from "drizzle-orm";
import { db, collectionCenters, pickupRequests, platformSettings, productListings, settlementRecords, users } from "@/db";
import { hashPassword } from "@/lib/auth";
import { sampleAccountPassword } from "@/lib/sample-accounts.server";
import { DEMO_COVERAGE_AREAS, PLATFORM_CONTACT, indicativeValuePaise } from "@/lib/constants";
import { seedTabletJourney } from "@/lib/seed-tablet-journey";

const newHubs = [
  { code: "PB-ASR-DEMO-07", name: "EcoTrace Amritsar Circular Collection Studio", city: "Amritsar", district: "Amritsar", pincode: "143001", latitude: 31.634, longitude: 74.8723, address: "Amritsar Central Commercial District (illustrative area only), Punjab", hours: "Mon–Sat · 10:00 AM – 6:00 PM (sample)", load: 84 },
  { code: "PB-JLD-DEMO-08", name: "EcoTrace Jalandhar Green Electronics Hub", city: "Jalandhar", district: "Jalandhar", pincode: "144001", latitude: 31.326, longitude: 75.5762, address: "Jalandhar City Commercial District (illustrative area only), Punjab", hours: "Mon–Sat · 9:30 AM – 6:00 PM (sample)", load: 112 },
  { code: "PB-PGW-DEMO-09", name: "EcoTrace Phagwara Community Drop-Off", city: "Phagwara", district: "Kapurthala", pincode: "144401", latitude: 31.2254, longitude: 75.7708, address: "Phagwara Town Centre Commercial Area (illustrative area only), Punjab", hours: "Tue–Sun · 10:00 AM – 5:30 PM (sample)", load: 46 },
  { code: "PB-MHL-DEMO-10", name: "EcoTrace Mohali Tech Recovery Point", city: "Mohali", district: "SAS Nagar", pincode: "160055", latitude: 30.7046, longitude: 76.7179, address: "Mohali Phase 8 Commercial Area (illustrative area only), Punjab", hours: "Mon–Sat · 9:00 AM – 6:00 PM (sample)", load: 127 },
  { code: "PB-PTL-DEMO-11", name: "EcoTrace Patiala Circular Corner", city: "Patiala", district: "Patiala", pincode: "147001", latitude: 30.3398, longitude: 76.3869, address: "Patiala Central Market Commercial Zone (illustrative area only), Punjab", hours: "Mon–Fri · 10:00 AM – 6:00 PM (sample)", load: 62 },
  { code: "PB-GRY-SAMPLE-12", name: "EcoTrace Goraya Collection Point", city: "Goraya", district: "Jalandhar", pincode: "144409", latitude: 31.124, longitude: 75.769, address: "Goraya town-center commercial area (illustrative only), Punjab", hours: "Mon–Sat · 10:00 AM – 5:00 PM (sample)", load: 21 },
  { code: "PB-BNG-SAMPLE-13", name: "EcoTrace Banga Circular Hub", city: "Banga", district: "Shaheed Bhagat Singh Nagar", pincode: "144505", latitude: 31.185, longitude: 75.995, address: "Banga central market commercial area (illustrative only), Punjab", hours: "Mon–Sat · 10:00 AM – 5:30 PM (sample)", load: 29 },
  { code: "PB-KPT-SAMPLE-14", name: "EcoTrace Kapurthala Collection Point", city: "Kapurthala", district: "Kapurthala", pincode: "144601", latitude: 31.38, longitude: 75.382, address: "Kapurthala city commercial area (illustrative only), Punjab", hours: "Mon–Sat · 9:30 AM – 6:00 PM (sample)", load: 33 },
  { code: "PB-HSP-SAMPLE-15", name: "EcoTrace Hoshiarpur Green Hub", city: "Hoshiarpur", district: "Hoshiarpur", pincode: "146001", latitude: 31.532, longitude: 75.912, address: "Hoshiarpur commercial district (illustrative only), Punjab", hours: "Tue–Sun · 10:00 AM – 5:30 PM (sample)", load: 18 },
];

const accepted = ["Mobile Phones", "Laptops", "Tablets", "Monitors", "Keyboards", "Mice", "Printers", "Chargers and Cables", "Batteries", "Circuit Boards", "Other Electronic Waste"];

export async function seedMarketplaceAndHubs() {
  const manager = await db.select({ id: users.id }).from(users).where(eq(users.email, "center@ecotrace.demo")).limit(1);
  for (const hub of newHubs) {
    await db.insert(collectionCenters).values({
      code: hub.code,
      name: hub.name,
      city: hub.city,
      state: "Punjab",
      district: hub.district,
      pincode: hub.pincode,
      latitude: hub.latitude,
      longitude: hub.longitude,
      address: hub.address,
      acceptedCategories: accepted,
      operatingHours: hub.hours,
      verificationLabel: "Live and verified",
      isDemoSample: true,
      managerId: manager[0]?.id ?? null,
      capacityKg: 750,
      currentLoadKg: hub.load,
      contactPhone: PLATFORM_CONTACT.phone,
      contactEmail: PLATFORM_CONTACT.email,
    }).onConflictDoUpdate({
      target: collectionCenters.code,
      set: { name: hub.name, contactPhone: PLATFORM_CONTACT.phone, contactEmail: PLATFORM_CONTACT.email, verificationLabel: "Live and verified", operatingHours: hub.hours },
    });
  }

  // Refresh older sample rows without rewriting their measured loads or customer associations.
  const baseNames: Record<string, string> = {
    "PB-LDH-DEMO-01": "EcoTrace Ludhiana Collection Point",
    "CH-TRI-DEMO-02": "EcoTrace Chandigarh Collection Point",
    "DL-OKH-DEMO-03": "EcoTrace Delhi NCR Collection Point",
    "KA-BLR-DEMO-04": "EcoTrace Bengaluru Collection Point",
    "MH-MUM-DEMO-05": "EcoTrace Mumbai Collection Point",
    "MH-PUN-DEMO-06": "EcoTrace Pune Collection Point",
  };
  for (const [code, name] of Object.entries(baseNames)) {
    await db.update(collectionCenters).set({ name, contactPhone: PLATFORM_CONTACT.phone, contactEmail: PLATFORM_CONTACT.email, verificationLabel: "Live and verified" }).where(eq(collectionCenters.code, code));
  }

  // Keep the configured pilot area aligned with the added sample cities. Do not broaden nationwide.
  await db.insert(platformSettings).values({
    key: "coverage_boundaries",
    value: { mode: "demonstration_zones", disclaimer: "All shown locations are demonstration pilot records, not operational nationwide coverage or certified facilities.", regions: DEMO_COVERAGE_AREAS },
    description: "Configured demonstration collection coverage boundaries",
  }).onConflictDoUpdate({
    target: platformSettings.key,
    set: { value: { mode: "demonstration_zones", disclaimer: "All shown locations are demonstration pilot records, not operational nationwide coverage or certified facilities.", regions: DEMO_COVERAGE_AREAS } },
  });

  const demoCustomers = [
    { email: "amritsar.customer@ecotrace.demo", fullName: "Navpreet Kaur", city: "Amritsar", address: "Amritsar Central Area, Punjab (sample)" },
    { email: "phagwara.customer@ecotrace.demo", fullName: "Manpreet Gill", city: "Phagwara", address: "Phagwara Town Area, Punjab (sample)" },
  ];
  const existing = await db.select({ email: users.email }).from(users);
  const emails = new Set(existing.map((u) => u.email));
  if (demoCustomers.some((u) => !emails.has(u.email))) {
    const passwordHash = await hashPassword(sampleAccountPassword());
    for (const sample of demoCustomers) {
      if (emails.has(sample.email)) continue;
      await db.insert(users).values({
        ...sample,
        passwordHash,
        state: "Punjab",
        role: "citizen",
        greenPoints: 0,
        isDemoAccount: true,
      }).onConflictDoNothing();
    }
  }

  const people = await db.select({ id: users.id, email: users.email }).from(users);
  const ownerId = (email: string) => people.find((p) => p.email === email)?.id;
  const reqs = await db.select({ id: pickupRequests.id, requestCode: pickupRequests.requestCode }).from(pickupRequests);
  const requestId = (code: string) => reqs.find((r) => r.requestCode === code)?.id ?? null;
  const now = new Date();
  const earlier = (n: number) => new Date(now.getTime() - n * 86400000);

  const showcase = [
    {
      listingCode: "LIST-DEMO-1001", owner: "citizen@ecotrace.demo", request: "ECO-2026-1001", title: "Silver notebook duo", brand: "Assorted", model: "14-inch notebooks", category: "Laptops", condition: "repairable" as const, quantity: 2, imageUrl: "/images/listing-laptop.jpg", description: "Two retired notebooks. Storage removed; battery inspected. Illustrative customer listing.", city: "Ludhiana", status: "paid" as const, offeredAmountPaise: 280000, quoteNotes: "Demo offer for two notebooks; confirmed after collection. Not a market price guarantee.", indicativeValuePaise: indicativeValuePaise("Laptops", "repairable", 2), age: 29,
    },
    {
      listingCode: "LIST-DEMO-1002", owner: "citizen@ecotrace.demo", request: null, title: "Everyday smartphone pair", brand: "Assorted", model: "Android handsets", category: "Mobile Phones", condition: "working" as const, quantity: 2, imageUrl: "/images/listing-phone.jpg", description: "Two well-used handsets, power on normally. Awaiting customer acceptance of demo offer.", city: "Ludhiana", status: "quoted" as const, offeredAmountPaise: 120000, quoteNotes: "Sample admin-reviewed offer of ₹1,200 for both handsets, subject to physical inspection.", indicativeValuePaise: indicativeValuePaise("Mobile Phones", "working", 2), age: 2,
    },
    {
      listingCode: "LIST-DEMO-1003", owner: "organization@ecotrace.demo", request: "ECO-2026-1002", title: "Office monitor refresh", brand: "Assorted", model: "24-inch monitors", category: "Monitors", condition: "repairable" as const, quantity: 5, imageUrl: "/images/listing-monitor.jpg", description: "Five retired office screens. Asset inventory has been completed; demo settlement pending approval.", city: "Ludhiana", status: "settlement_ready" as const, offeredAmountPaise: 245000, quoteNotes: "Demo organization lot quote after internal review.", indicativeValuePaise: indicativeValuePaise("Monitors", "repairable", 5), age: 28,
    },
    {
      listingCode: "LIST-DEMO-1004", owner: "amritsar.customer@ecotrace.demo", request: null, title: "Amritsar smartphone collection", brand: "Assorted", model: "Three pre-owned handsets", category: "Mobile Phones", condition: "non_working" as const, quantity: 3, imageUrl: "/images/listing-phone.jpg", description: "Three older devices ready for responsible recovery in the Amritsar pilot region.", city: "Amritsar", status: "quoted" as const, offeredAmountPaise: 62000, quoteNotes: "Illustrative demo offer, subject to acceptance and verified collection.", indicativeValuePaise: indicativeValuePaise("Mobile Phones", "non_working", 3), age: 6,
    },
    {
      listingCode: "LIST-DEMO-1005", owner: "phagwara.customer@ecotrace.demo", request: null, title: "Phagwara study laptop", brand: "Assorted", model: "13-inch notebook", category: "Laptops", condition: "working" as const, quantity: 1, imageUrl: "/images/listing-laptop.jpg", description: "One pre-owned study laptop. Initial listing awaiting a reviewed offer.", city: "Phagwara", status: "listed" as const, offeredAmountPaise: null, quoteNotes: null, indicativeValuePaise: indicativeValuePaise("Laptops", "working", 1), age: 1,
    },
    {
      listingCode: "LIST-DEMO-1006", owner: "citizen@ecotrace.demo", request: null, title: "Sorted cables and chargers", brand: "Assorted", model: "Mixed connectors", category: "Chargers and Cables", condition: "non_working" as const, quantity: 5, imageUrl: "/images/listing-cables.jpg", description: "Neatly sorted chargers and cables ready for a demo collection request.", city: "Jalandhar", status: "listed" as const, offeredAmountPaise: null, quoteNotes: null, indicativeValuePaise: indicativeValuePaise("Chargers and Cables", "non_working", 5), age: 1,
    },
  ];

  for (const item of showcase) {
    const id = ownerId(item.owner);
    if (!id) continue;
    await db.insert(productListings).values({
      listingCode: item.listingCode,
      ownerId: id,
      requestId: item.request ? requestId(item.request) : null,
      title: item.title,
      brand: item.brand,
      model: item.model,
      category: item.category,
      condition: item.condition,
      quantity: item.quantity,
      imageUrl: item.imageUrl,
      description: item.description,
      city: item.city,
      state: "Punjab",
      indicativeValuePaise: item.indicativeValuePaise,
      offeredAmountPaise: item.offeredAmountPaise,
      quoteNotes: item.quoteNotes,
      status: item.status,
      isDemoRecord: true,
      createdAt: earlier(item.age),
      quotedAt: item.offeredAmountPaise != null ? earlier(Math.max(item.age - 1, 0)) : null,
      acceptedAt: item.request ? earlier(Math.max(item.age - 2, 0)) : null,
    }).onConflictDoNothing();
  }

  const l1 = await db.select().from(productListings).where(eq(productListings.listingCode, "LIST-DEMO-1001")).limit(1);
  const l3 = await db.select().from(productListings).where(eq(productListings.listingCode, "LIST-DEMO-1003")).limit(1);
  if (l1[0]?.requestId) {
    await db.insert(settlementRecords).values({
      statementCode: "STMT-DEMO-2026-1001",
      listingId: l1[0].id,
      ownerId: l1[0].ownerId,
      requestId: l1[0].requestId,
      quotedAmountPaise: 280000,
      finalAmountPaise: 280000,
      status: "credited",
      method: "demo_wallet",
      payoutReference: "DEMO-WALLET-PB-1001",
      notes: "Simulated wallet credit for presentation only. No bank transfer or real money took place.",
      isDemoRecord: true,
      createdAt: earlier(22),
      approvedAt: earlier(16),
      creditedAt: earlier(15),
    }).onConflictDoNothing();
  }
  if (l3[0]?.requestId) {
    await db.insert(settlementRecords).values({
      statementCode: "STMT-DEMO-2026-1003",
      listingId: l3[0].id,
      ownerId: l3[0].ownerId,
      requestId: l3[0].requestId,
      quotedAmountPaise: 245000,
      finalAmountPaise: 245000,
      status: "pending_approval",
      method: "demo_wallet",
      notes: "Sample settlement awaiting administrator sign-off. No payment has been made.",
      isDemoRecord: true,
      createdAt: earlier(14),
    }).onConflictDoNothing();
  }

  await seedTabletJourney();
}
