import { eq } from "drizzle-orm";
import {
  db,
  users,
  collectionCenters,
  recyclingBatches,
  pickupRequests,
  traceabilityEvents,
  eprRecords,
  notifications,
  auditLogs,
  platformSettings,
} from "@/db";
import { hashPassword } from "@/lib/auth";
import { sampleAccountPassword } from "@/lib/sample-accounts.server";
import { DEMO_COVERAGE_AREAS, PLATFORM_CONTACT } from "@/lib/constants";
import { seedMarketplaceAndHubs } from "@/lib/seed-marketplace";

let seedPromise: Promise<void> | null = null;
let alreadyVerified = false;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function ensureSeeded(): Promise<void> {
  if (alreadyVerified) return;
  if (seedPromise) return seedPromise;

  seedPromise = runSeed()
    .then(() => {
      alreadyVerified = true;
    })
    .catch((err) => {
      seedPromise = null;
      console.error("Seed error:", err);
      throw err;
    });

  return seedPromise;
}

async function runSeed(): Promise<void> {
  const existingAdmin = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "admin@ecotrace.demo"))
    .limit(1);

  if (existingAdmin.length > 0) {
    // Also verify Punjab center exists
    const pbCenter = await db
      .select({ id: collectionCenters.id })
      .from(collectionCenters)
      .where(eq(collectionCenters.code, "PB-LDH-DEMO-01"))
      .limit(1);
    if (pbCenter.length > 0) {
      await seedMarketplaceAndHubs();
      return;
    }
  }

  const demoPasswordHash = await hashPassword(sampleAccountPassword());

  // 1. Seed 6 Demo Role Accounts
  const demoUsersData = [
    {
      email: "citizen@ecotrace.demo",
      passwordHash: demoPasswordHash,
      fullName: "Aarav Sharma",
      role: "citizen" as const,
      phone: "+91-98140-00101",
      city: "Ludhiana",
      state: "Punjab",
      address: "Sarabha Nagar Demo Block, Ludhiana, Punjab 141001",
      organizationName: null,
      greenPoints: 420,
      isDemoAccount: true,
    },
    {
      email: "partner@ecotrace.demo",
      passwordHash: demoPasswordHash,
      fullName: "Gurpreet Singh (GreenRoute Demo Logistics)",
      role: "partner" as const,
      phone: "+91-98140-00102",
      city: "Ludhiana",
      state: "Punjab",
      address: "Focal Point Logistics Yard (Demo), Ludhiana, Punjab",
      organizationName: "GreenRoute Eco Logistics (Demo)",
      greenPoints: 0,
      isDemoAccount: true,
    },
    {
      email: "recycler@ecotrace.demo",
      passwordHash: demoPasswordHash,
      fullName: "Dr. Meera Nair (CircularTech Recovery Demo)",
      role: "recycler" as const,
      phone: "+91-98140-00103",
      city: "Mohali",
      state: "Punjab",
      address: "Industrial Area Phase 8B (Demo Unit), Mohali, Punjab",
      organizationName: "CircularTech Material Recovery (Demo)",
      greenPoints: 0,
      isDemoAccount: true,
    },
    {
      email: "organization@ecotrace.demo",
      passwordHash: demoPasswordHash,
      fullName: "Vikram Malhotra (Bharat Electronics Demo)",
      role: "organization" as const,
      phone: "+91-98140-00104",
      city: "New Delhi",
      state: "Delhi",
      address: "Connaught Place Demo Tower, New Delhi",
      organizationName: "Bharat Tech & Electronics Producer (Demo)",
      greenPoints: 180,
      isDemoAccount: true,
    },
    {
      email: "center@ecotrace.demo",
      passwordHash: demoPasswordHash,
      fullName: "Simran Kaur (Punjab Hub Manager)",
      role: "center_manager" as const,
      phone: "+91-98140-00105",
      city: "Ludhiana",
      state: "Punjab",
      address: "Focal Point Phase 2 (Demo Corridor), Ludhiana, Punjab",
      organizationName: "EcoTrace Punjab Demonstration Hub",
      greenPoints: 0,
      isDemoAccount: true,
    },
    {
      email: "admin@ecotrace.demo",
      passwordHash: demoPasswordHash,
      fullName: "Ananya Verma (Platform Administrator)",
      role: "admin" as const,
      phone: "+91-98140-00106",
      city: "Chandigarh",
      state: "Chandigarh",
      address: "Sector 17 EcoTrace Operations Desk (Demo), Chandigarh",
      organizationName: "EcoTrace India Platform Ops",
      greenPoints: 0,
      isDemoAccount: true,
    },
  ];

  const userMap: Record<string, number> = {};

  for (const u of demoUsersData) {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, u.email))
      .limit(1);
    if (existing.length > 0) {
      userMap[u.role] = existing[0].id;
    } else {
      const [inserted] = await db.insert(users).values(u).returning();
      userMap[u.role] = inserted.id;
    }
  }

  // 2. Seed Collection Centers (including the required Punjab Demonstration Collection Center)
  const centersData = [
    {
      code: "PB-LDH-DEMO-01",
      name: "EcoTrace Punjab Demonstration Drop-Off Hub (Ludhiana)",
      city: "Ludhiana",
      state: "Punjab",
      district: "Ludhiana",
      address:
        "Phase 2 Focal Point Commercial Demo Zone (Non-Private Public Placeholder), Ludhiana, Punjab",
      pincode: "141010",
      latitude: 30.901,
      longitude: 75.8573,
      acceptedCategories: [
        "Mobile Phones",
        "Laptops",
        "Tablets",
        "Monitors",
        "Keyboards",
        "Mice",
        "Chargers and Cables",
        "Batteries",
        "Circuit Boards",
        "Printers",
        "Other Electronic Waste",
      ],
      operatingHours: "Mon–Sat: 09:30 AM – 06:00 PM (Demonstration Schedule)",
      contactPhone: PLATFORM_CONTACT.phone,
      contactEmail: PLATFORM_CONTACT.email,
      verificationLabel: "Demonstration Sample Center — Not a Government-Authorized Facility",
      isDemoSample: true,
      isActive: true,
      managerId: userMap.center_manager,
      capacityKg: 1500,
      currentLoadKg: 312.5,
    },
    {
      code: "CH-TRI-DEMO-02",
      name: "EcoTrace Chandigarh Tri-City Sample Hub",
      city: "Chandigarh",
      state: "Chandigarh",
      district: "Chandigarh",
      address: "Industrial Area Phase 1 Demo Park (Sample Location), Chandigarh",
      pincode: "160002",
      latitude: 30.7333,
      longitude: 76.7794,
      acceptedCategories: [
        "Mobile Phones",
        "Laptops",
        "Tablets",
        "Monitors",
        "Keyboards",
        "Mice",
        "Printers",
        "Chargers and Cables",
        "Televisions",
      ],
      operatingHours: "Mon–Sat: 10:00 AM – 06:30 PM (Sample)",
      contactPhone: PLATFORM_CONTACT.phone,
      contactEmail: PLATFORM_CONTACT.email,
      verificationLabel: "Demonstration Sample Center — Non-Statutory Record",
      isDemoSample: true,
      isActive: true,
      managerId: userMap.center_manager,
      capacityKg: 2000,
      currentLoadKg: 485.0,
    },
    {
      code: "DL-OKH-DEMO-03",
      name: "EcoTrace Delhi NCR Okhla Demo Collection Point",
      city: "New Delhi",
      state: "Delhi",
      district: "South East Delhi",
      address: "Okhla Industrial Estate Phase 3 Demo Bay (Sample Location), New Delhi",
      pincode: "110020",
      latitude: 28.5494,
      longitude: 77.2732,
      acceptedCategories: [
        "Mobile Phones",
        "Laptops",
        "Monitors",
        "Printers",
        "Batteries",
        "Circuit Boards",
        "Televisions",
        "Other Electronic Waste",
      ],
      operatingHours: "Mon–Sat: 09:00 AM – 07:00 PM (Sample)",
      contactPhone: PLATFORM_CONTACT.phone,
      contactEmail: PLATFORM_CONTACT.email,
      verificationLabel: "Demonstration Sample Center — Non-Statutory Record",
      isDemoSample: true,
      isActive: true,
      managerId: null,
      capacityKg: 3500,
      currentLoadKg: 920.4,
    },
    {
      code: "KA-BLR-DEMO-04",
      name: "EcoTrace Bengaluru Whitefield Circular Demo Center",
      city: "Bengaluru",
      state: "Karnataka",
      district: "Bengaluru Urban",
      address: "EPIP Zone Whitefield Demo Depot (Sample Location), Bengaluru, Karnataka",
      pincode: "560066",
      latitude: 12.9698,
      longitude: 77.75,
      acceptedCategories: [
        "Mobile Phones",
        "Laptops",
        "Tablets",
        "Monitors",
        "Keyboards",
        "Mice",
        "Circuit Boards",
        "Chargers and Cables",
        "Batteries",
      ],
      operatingHours: "Mon–Sat: 09:30 AM – 06:30 PM (Sample)",
      contactPhone: PLATFORM_CONTACT.phone,
      contactEmail: PLATFORM_CONTACT.email,
      verificationLabel: "Demonstration Sample Center — Non-Statutory Record",
      isDemoSample: true,
      isActive: true,
      managerId: null,
      capacityKg: 3000,
      currentLoadKg: 740.8,
    },
    {
      code: "MH-MUM-DEMO-05",
      name: "EcoTrace Mumbai Andheri Green Drop-Off (Sample)",
      city: "Mumbai",
      state: "Maharashtra",
      district: "Mumbai Suburban",
      address: "MIDC Andheri East Demo Dock (Sample Location), Mumbai, Maharashtra",
      pincode: "400093",
      latitude: 19.1136,
      longitude: 72.8697,
      acceptedCategories: [
        "Mobile Phones",
        "Laptops",
        "Tablets",
        "Printers",
        "Chargers and Cables",
        "Batteries",
        "Televisions",
        "Other Electronic Waste",
      ],
      operatingHours: "Tue–Sun: 10:00 AM – 06:00 PM (Sample)",
      contactPhone: PLATFORM_CONTACT.phone,
      contactEmail: PLATFORM_CONTACT.email,
      verificationLabel: "Demonstration Sample Center — Non-Statutory Record",
      isDemoSample: true,
      isActive: true,
      managerId: null,
      capacityKg: 2800,
      currentLoadKg: 615.2,
    },
    {
      code: "MH-PUN-DEMO-06",
      name: "EcoTrace Pune Hinjewadi IT E-Waste Demo Hub",
      city: "Pune",
      state: "Maharashtra",
      district: "Pune",
      address: "Rajiv Gandhi Infotech Park Phase 1 Demo Zone (Sample), Pune, Maharashtra",
      pincode: "411057",
      latitude: 18.5913,
      longitude: 73.7389,
      acceptedCategories: [
        "Laptops",
        "Monitors",
        "Keyboards",
        "Mice",
        "Circuit Boards",
        "Chargers and Cables",
        "Printers",
      ],
      operatingHours: "Mon–Fri: 09:00 AM – 06:00 PM (Sample)",
      contactPhone: PLATFORM_CONTACT.phone,
      contactEmail: PLATFORM_CONTACT.email,
      verificationLabel: "Demonstration Sample Center — Non-Statutory Record",
      isDemoSample: true,
      isActive: true,
      managerId: null,
      capacityKg: 2400,
      currentLoadKg: 410.0,
    },
  ];

  const centerMap: Record<string, number> = {};
  for (const c of centersData) {
    const existing = await db
      .select()
      .from(collectionCenters)
      .where(eq(collectionCenters.code, c.code))
      .limit(1);
    if (existing.length > 0) {
      centerMap[c.code] = existing[0].id;
    } else {
      const [inserted] = await db.insert(collectionCenters).values(c).returning();
      centerMap[c.code] = inserted.id;
    }
  }

  // Only seed historical transactions if none exist yet
  const existingReqs = await db.select({ id: pickupRequests.id }).from(pickupRequests).limit(1);
  if (existingReqs.length > 0) {
    return;
  }

  // 3. Seed Recycling Batches
  const [batchDocumented] = await db
    .insert(recyclingBatches)
    .values({
      batchCode: "BATCH-2026-PB01",
      collectionCenterId: centerMap["PB-LDH-DEMO-01"],
      recyclerId: userMap.recycler,
      status: "documented",
      dispatchedQty: 19,
      dispatchedWeightKg: 42.6,
      receivedWeightKg: 42.2,
      acceptedQty: 19,
      rejectedQty: 0,
      processedQty: 19,
      documentedRecyclingKg: 39.8,
      recoveryBreakdown: {
        metalsKg: 18.4,
        plasticsKg: 11.2,
        glassKg: 5.6,
        circuitBoardsKg: 4.6,
        hazardousDivertedKg: 2.4,
      },
      supportingDocuments: [
        {
          id: "doc-pb01-1",
          title: "Weighbridge Gate Receipt (Demo Sample)",
          docType: "Weighment Slip",
          referenceNo: "WB-PB-2026-014",
          fileName: "weighbridge-pb01-demo.pdf",
          uploadedBy: "Dr. Meera Nair",
          uploadedAt: daysAgo(18).toISOString(),
          notes: "Verified calibrated digital scale reading at Mohali Demo Unit.",
        },
        {
          id: "doc-pb01-2",
          title: "Dismantling & Recovery Summary Sheet (Demo Sample)",
          docType: "Processing Log",
          referenceNo: "PROC-PB-2026-014",
          fileName: "dismantling-summary-pb01-demo.pdf",
          uploadedBy: "Dr. Meera Nair",
          uploadedAt: daysAgo(15).toISOString(),
          notes: "Internal traceability documentation — not a statutory CPCB certificate.",
        },
      ],
      eprReviewStatus: "documented_non_statutory",
      discrepancyFlag: false,
      processingNotes:
        "Complete manual dismantling completed; batteries isolated safely prior to metal shredding.",
      isDemoRecord: true,
      createdAt: daysAgo(22),
      receivedAt: daysAgo(18),
      processedAt: daysAgo(16),
      documentedAt: daysAgo(15),
      updatedAt: daysAgo(15),
    })
    .returning();

  const [batchProcessing] = await db
    .insert(recyclingBatches)
    .values({
      batchCode: "BATCH-2026-DL02",
      collectionCenterId: centerMap["DL-OKH-DEMO-03"],
      recyclerId: userMap.recycler,
      status: "processing",
      dispatchedQty: 14,
      dispatchedWeightKg: 31.4,
      receivedWeightKg: 31.1,
      acceptedQty: 13,
      rejectedQty: 1,
      processedQty: 8,
      documentedRecyclingKg: null,
      recoveryBreakdown: null,
      supportingDocuments: [
        {
          id: "doc-dl02-1",
          title: "Incoming Gate Manifest (Demo Sample)",
          docType: "Gate Receipt",
          referenceNo: "WB-DL-2026-029",
          fileName: "gate-manifest-dl02-demo.pdf",
          uploadedBy: "Dr. Meera Nair",
          uploadedAt: daysAgo(7).toISOString(),
          notes: "1 damaged CRT unit quarantined separately.",
        },
      ],
      eprReviewStatus: "under_review",
      discrepancyFlag: false,
      processingNotes: "Currently undergoing PCB depopulation and aluminum frame sorting.",
      isDemoRecord: true,
      createdAt: daysAgo(11),
      receivedAt: daysAgo(7),
      processedAt: null,
      documentedAt: null,
      updatedAt: daysAgo(4),
    })
    .returning();

  const [batchIncoming] = await db
    .insert(recyclingBatches)
    .values({
      batchCode: "BATCH-2026-PB03",
      collectionCenterId: centerMap["PB-LDH-DEMO-01"],
      recyclerId: userMap.recycler,
      status: "dispatched",
      dispatchedQty: 11,
      dispatchedWeightKg: 18.9,
      receivedWeightKg: null,
      acceptedQty: null,
      rejectedQty: null,
      processedQty: null,
      documentedRecyclingKg: null,
      recoveryBreakdown: null,
      supportingDocuments: [],
      eprReviewStatus: "pending_documentation",
      discrepancyFlag: false,
      processingNotes: "In transit from Ludhiana Punjab Demo Hub to Mohali Recovery Unit.",
      isDemoRecord: true,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(2),
    })
    .returning();

  const [batchDiscrepancy] = await db
    .insert(recyclingBatches)
    .values({
      batchCode: "BATCH-2026-KA04",
      collectionCenterId: centerMap["KA-BLR-DEMO-04"],
      recyclerId: userMap.recycler,
      status: "discrepancy_review",
      dispatchedQty: 12,
      dispatchedWeightKg: 28.5,
      receivedWeightKg: 23.1,
      acceptedQty: 10,
      rejectedQty: 2,
      processedQty: null,
      documentedRecyclingKg: null,
      recoveryBreakdown: null,
      supportingDocuments: [
        {
          id: "doc-ka04-1",
          title: "Weight Variance Incident Note (Demo Sample)",
          docType: "Discrepancy Report",
          referenceNo: "VAR-KA-2026-004",
          fileName: "variance-ka04-demo.pdf",
          uploadedBy: "Dr. Meera Nair",
          uploadedAt: daysAgo(5).toISOString(),
          notes: "5.4 kg shortfall (-18.9%) between dispatched manifest and gate weighbridge.",
        },
      ],
      eprReviewStatus: "pending_documentation",
      discrepancyFlag: true,
      discrepancyNotes:
        "Received weight (23.1 kg) is 18.9% lower than dispatched manifest (28.5 kg). Flagged for admin audit.",
      processingNotes: "Hold placed until variance investigation concludes.",
      isDemoRecord: true,
      createdAt: daysAgo(9),
      receivedAt: daysAgo(5),
      updatedAt: daysAgo(5),
    })
    .returning();

  // 4. Seed Diverse Pickup Requests across 2–75 days for accurate date filter testing
  const requestsSeed = [
    {
      requestCode: "ECO-2026-1001",
      citizenId: userMap.citizen,
      assignedPartnerId: userMap.partner,
      collectionCenterId: centerMap["PB-LDH-DEMO-01"],
      batchId: batchDocumented.id,
      status: "documented" as const,
      items: [
        {
          category: "Laptops",
          quantity: 2,
          estimatedUnitWeightKg: 2.1,
          estimatedTotalWeightKg: 4.2,
          aiPredictedCategory: "Laptops",
          aiConfidence: 0.91,
          userCorrected: false,
        },
        {
          category: "Mobile Phones",
          quantity: 4,
          estimatedUnitWeightKg: 0.19,
          estimatedTotalWeightKg: 0.76,
          aiPredictedCategory: "Mobile Phones",
          aiConfidence: 0.88,
          userCorrected: false,
        },
        {
          category: "Chargers and Cables",
          quantity: 5,
          estimatedUnitWeightKg: 0.22,
          estimatedTotalWeightKg: 1.1,
          aiPredictedCategory: "Other Electronic Waste",
          aiConfidence: 0.62,
          userCorrected: true,
        },
      ],
      requestedTotalQty: 11,
      estimatedWeightKg: 6.06,
      actualCollectedQty: 11,
      actualCollectedWeightKg: 6.4,
      aiClassificationMode: "demo_mode",
      pickupAddress: "Sarabha Nagar Demo Block, Ludhiana, Punjab",
      city: "Ludhiana",
      state: "Punjab",
      pincode: "141001",
      preferredDate: daysAgo(27).toISOString().slice(0, 10),
      preferredTimeSlot: "09:00 AM - 12:00 PM",
      citizenNotes: "Old college laptops and family phones ready in a cardboard box.",
      partnerNotes: "Weighed on calibrated hanging scale: 6.4 kg verified.",
      discrepancyFlag: false,
      isDemoRecord: true,
      createdAt: daysAgo(29),
      updatedAt: daysAgo(15),
      collectedAt: daysAgo(26),
      verifiedAt: daysAgo(24),
    },
    {
      requestCode: "ECO-2026-1002",
      citizenId: userMap.organization,
      assignedPartnerId: userMap.partner,
      collectionCenterId: centerMap["PB-LDH-DEMO-01"],
      batchId: batchDocumented.id,
      status: "documented" as const,
      items: [
        {
          category: "Monitors",
          quantity: 5,
          estimatedUnitWeightKg: 4.8,
          estimatedTotalWeightKg: 24.0,
          aiPredictedCategory: "Monitors",
          aiConfidence: 0.86,
          userCorrected: false,
        },
        {
          category: "Printers",
          quantity: 2,
          estimatedUnitWeightKg: 6.5,
          estimatedTotalWeightKg: 13.0,
          aiPredictedCategory: "Printers",
          aiConfidence: 0.79,
          userCorrected: false,
        },
        {
          category: "Keyboards",
          quantity: 1,
          estimatedUnitWeightKg: 0.75,
          estimatedTotalWeightKg: 0.75,
          aiPredictedCategory: "Keyboards",
          aiConfidence: 0.82,
          userCorrected: false,
        },
      ],
      requestedTotalQty: 8,
      estimatedWeightKg: 37.75,
      actualCollectedQty: 8,
      actualCollectedWeightKg: 36.2,
      aiClassificationMode: "demo_mode",
      pickupAddress: "Industrial Area Demo Office, Ludhiana, Punjab",
      city: "Ludhiana",
      state: "Punjab",
      pincode: "141003",
      preferredDate: daysAgo(25).toISOString().slice(0, 10),
      preferredTimeSlot: "12:00 PM - 03:00 PM",
      citizenNotes: "Branch IT refresh lot.",
      partnerNotes: "Collected and transported to PB-LDH-DEMO-01.",
      discrepancyFlag: false,
      isDemoRecord: true,
      createdAt: daysAgo(28),
      updatedAt: daysAgo(15),
      collectedAt: daysAgo(25),
      verifiedAt: daysAgo(23),
    },
    {
      requestCode: "ECO-2026-1003",
      citizenId: userMap.citizen,
      assignedPartnerId: userMap.partner,
      collectionCenterId: centerMap["DL-OKH-DEMO-03"],
      batchId: batchProcessing.id,
      status: "processing" as const,
      items: [
        {
          category: "Televisions",
          quantity: 2,
          estimatedUnitWeightKg: 11.5,
          estimatedTotalWeightKg: 23.0,
          aiPredictedCategory: "Televisions",
          aiConfidence: 0.85,
          userCorrected: false,
        },
        {
          category: "Circuit Boards",
          quantity: 6,
          estimatedUnitWeightKg: 0.45,
          estimatedTotalWeightKg: 2.7,
          aiPredictedCategory: "Circuit Boards",
          aiConfidence: 0.78,
          userCorrected: false,
        },
        {
          category: "Batteries",
          quantity: 6,
          estimatedUnitWeightKg: 0.35,
          estimatedTotalWeightKg: 2.1,
          aiPredictedCategory: "Batteries",
          aiConfidence: 0.81,
          userCorrected: false,
        },
      ],
      requestedTotalQty: 14,
      estimatedWeightKg: 27.8,
      actualCollectedQty: 14,
      actualCollectedWeightKg: 31.4,
      aiClassificationMode: "demo_mode",
      pickupAddress: "Lajpat Nagar Demo Lane, New Delhi",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110024",
      preferredDate: daysAgo(13).toISOString().slice(0, 10),
      preferredTimeSlot: "03:00 PM - 06:00 PM",
      citizenNotes: "Includes two old LED TVs and spare UPS batteries.",
      partnerNotes: "Heavy glass frames accounted for higher measured weight.",
      discrepancyFlag: false,
      isDemoRecord: true,
      createdAt: daysAgo(15),
      updatedAt: daysAgo(4),
      collectedAt: daysAgo(13),
      verifiedAt: daysAgo(12),
    },
    {
      requestCode: "ECO-2026-1004",
      citizenId: userMap.citizen,
      assignedPartnerId: userMap.partner,
      collectionCenterId: centerMap["PB-LDH-DEMO-01"],
      batchId: batchIncoming.id,
      status: "batched" as const,
      items: [
        {
          category: "Monitors",
          quantity: 3,
          estimatedUnitWeightKg: 4.8,
          estimatedTotalWeightKg: 14.4,
          aiPredictedCategory: "Monitors",
          aiConfidence: 0.89,
          userCorrected: false,
        },
        {
          category: "Keyboards",
          quantity: 4,
          estimatedUnitWeightKg: 0.75,
          estimatedTotalWeightKg: 3.0,
          aiPredictedCategory: "Keyboards",
          aiConfidence: 0.84,
          userCorrected: false,
        },
        {
          category: "Mice",
          quantity: 4,
          estimatedUnitWeightKg: 0.12,
          estimatedTotalWeightKg: 0.48,
          aiPredictedCategory: "Mice",
          aiConfidence: 0.8,
          userCorrected: false,
        },
      ],
      requestedTotalQty: 11,
      estimatedWeightKg: 17.88,
      actualCollectedQty: 11,
      actualCollectedWeightKg: 18.9,
      aiClassificationMode: "demo_mode",
      pickupAddress: "Model Town Demo Enclave, Ludhiana, Punjab",
      city: "Ludhiana",
      state: "Punjab",
      pincode: "141002",
      preferredDate: daysAgo(5).toISOString().slice(0, 10),
      preferredTimeSlot: "09:00 AM - 12:00 PM",
      citizenNotes: "Home study workstation peripherals.",
      partnerNotes: "Collected on time and batched for Mohali recycler.",
      discrepancyFlag: false,
      isDemoRecord: true,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(2),
      collectedAt: daysAgo(5),
      verifiedAt: daysAgo(4),
    },
    {
      requestCode: "ECO-2026-1005",
      citizenId: userMap.organization,
      assignedPartnerId: userMap.partner,
      collectionCenterId: centerMap["KA-BLR-DEMO-04"],
      batchId: batchDiscrepancy.id,
      status: "received_by_recycler" as const,
      items: [
        {
          category: "Laptops",
          quantity: 12,
          estimatedUnitWeightKg: 2.1,
          estimatedTotalWeightKg: 25.2,
          aiPredictedCategory: "Laptops",
          aiConfidence: 0.9,
          userCorrected: false,
        },
      ],
      requestedTotalQty: 12,
      estimatedWeightKg: 25.2,
      actualCollectedQty: 12,
      actualCollectedWeightKg: 28.5,
      aiClassificationMode: "manual",
      pickupAddress: "Whitefield IT Park Demo Wing, Bengaluru, Karnataka",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560066",
      preferredDate: daysAgo(10).toISOString().slice(0, 10),
      preferredTimeSlot: "12:00 PM - 03:00 PM",
      citizenNotes: "Corporate decommissioned laptops without hard drives.",
      partnerNotes: "12 sealed units delivered to hub.",
      discrepancyFlag: true,
      discrepancyReason: "Downstream batch BATCH-2026-KA04 flagged for 5.4 kg gate shortfall.",
      isDemoRecord: true,
      createdAt: daysAgo(12),
      updatedAt: daysAgo(5),
      collectedAt: daysAgo(10),
      verifiedAt: daysAgo(9),
    },
    {
      requestCode: "ECO-2026-1006",
      citizenId: userMap.citizen,
      assignedPartnerId: userMap.partner,
      collectionCenterId: centerMap["PB-LDH-DEMO-01"],
      batchId: null,
      status: "verified" as const,
      items: [
        {
          category: "Tablets",
          quantity: 3,
          estimatedUnitWeightKg: 0.52,
          estimatedTotalWeightKg: 1.56,
          aiPredictedCategory: "Tablets",
          aiConfidence: 0.83,
          userCorrected: false,
        },
        {
          category: "Mobile Phones",
          quantity: 5,
          estimatedUnitWeightKg: 0.19,
          estimatedTotalWeightKg: 0.95,
          aiPredictedCategory: "Mobile Phones",
          aiConfidence: 0.92,
          userCorrected: false,
        },
      ],
      requestedTotalQty: 8,
      estimatedWeightKg: 2.51,
      actualCollectedQty: 8,
      actualCollectedWeightKg: 2.7,
      aiClassificationMode: "demo_mode",
      pickupAddress: "Civil Lines Demo Avenue, Ludhiana, Punjab",
      city: "Ludhiana",
      state: "Punjab",
      pincode: "141001",
      preferredDate: daysAgo(4).toISOString().slice(0, 10),
      preferredTimeSlot: "03:00 PM - 06:00 PM",
      citizenNotes: "Old Android phones and cracked tablets.",
      partnerNotes: "Verified at PB-LDH-DEMO-01, awaiting next outbound batch.",
      discrepancyFlag: false,
      isDemoRecord: true,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(3),
      collectedAt: daysAgo(4),
      verifiedAt: daysAgo(3),
    },
    {
      requestCode: "ECO-2026-1007",
      citizenId: userMap.citizen,
      assignedPartnerId: userMap.partner,
      collectionCenterId: centerMap["CH-TRI-DEMO-02"],
      batchId: null,
      status: "scheduled" as const,
      items: [
        {
          category: "Printers",
          quantity: 1,
          estimatedUnitWeightKg: 6.5,
          estimatedTotalWeightKg: 6.5,
          aiPredictedCategory: "Printers",
          aiConfidence: 0.87,
          userCorrected: false,
        },
        {
          category: "Chargers and Cables",
          quantity: 8,
          estimatedUnitWeightKg: 0.22,
          estimatedTotalWeightKg: 1.76,
          aiPredictedCategory: "Chargers and Cables",
          aiConfidence: 0.77,
          userCorrected: false,
        },
      ],
      requestedTotalQty: 9,
      estimatedWeightKg: 8.26,
      actualCollectedQty: null,
      actualCollectedWeightKg: null,
      aiClassificationMode: "demo_mode",
      pickupAddress: "Sector 22 Demo Residence, Chandigarh",
      city: "Chandigarh",
      state: "Chandigarh",
      pincode: "160022",
      preferredDate: daysAgo(-1).toISOString().slice(0, 10),
      preferredTimeSlot: "09:00 AM - 12:00 PM",
      citizenNotes: "Non-working inkjet printer plus tangled power bricks.",
      partnerNotes: "Scheduled for tomorrow morning route.",
      discrepancyFlag: false,
      isDemoRecord: true,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
      collectedAt: null,
      verifiedAt: null,
    },
    {
      requestCode: "ECO-2026-1008",
      citizenId: userMap.citizen,
      assignedPartnerId: null,
      collectionCenterId: centerMap["PB-LDH-DEMO-01"],
      batchId: null,
      status: "submitted" as const,
      items: [
        {
          category: "Laptops",
          quantity: 1,
          estimatedUnitWeightKg: 2.1,
          estimatedTotalWeightKg: 2.1,
          aiPredictedCategory: "Laptops",
          aiConfidence: 0.89,
          userCorrected: false,
        },
        {
          category: "Batteries",
          quantity: 3,
          estimatedUnitWeightKg: 0.35,
          estimatedTotalWeightKg: 1.05,
          aiPredictedCategory: "Batteries",
          aiConfidence: 0.84,
          userCorrected: false,
        },
      ],
      requestedTotalQty: 4,
      estimatedWeightKg: 3.15,
      actualCollectedQty: null,
      actualCollectedWeightKg: null,
      aiClassificationMode: "demo_mode",
      pickupAddress: "BRS Nagar Demo Block C, Ludhiana, Punjab",
      city: "Ludhiana",
      state: "Punjab",
      pincode: "141012",
      preferredDate: daysAgo(-2).toISOString().slice(0, 10),
      preferredTimeSlot: "12:00 PM - 03:00 PM",
      citizenNotes: "Swollen laptop battery kept inside fireproof pouch.",
      partnerNotes: null,
      discrepancyFlag: false,
      isDemoRecord: true,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
      collectedAt: null,
      verifiedAt: null,
    },
    {
      requestCode: "ECO-2026-1009",
      citizenId: userMap.organization,
      assignedPartnerId: userMap.partner,
      collectionCenterId: centerMap["MH-MUM-DEMO-05"],
      batchId: null,
      status: "collected" as const,
      items: [
        {
          category: "Monitors",
          quantity: 4,
          estimatedUnitWeightKg: 4.8,
          estimatedTotalWeightKg: 19.2,
          aiPredictedCategory: "Monitors",
          aiConfidence: 0.85,
          userCorrected: false,
        },
      ],
      requestedTotalQty: 4,
      estimatedWeightKg: 19.2,
      actualCollectedQty: 3,
      actualCollectedWeightKg: 13.8,
      aiClassificationMode: "manual",
      pickupAddress: "Andheri East Demo Plaza, Mumbai, Maharashtra",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400093",
      preferredDate: daysAgo(3).toISOString().slice(0, 10),
      preferredTimeSlot: "03:00 PM - 06:00 PM",
      citizenNotes: "4 monitors listed; one monitor retained by staff.",
      partnerNotes: "Collected 3 monitors (13.8 kg) instead of 4 requested.",
      discrepancyFlag: true,
      discrepancyReason: "Collected quantity (3) differs from requested quantity (4).",
      isDemoRecord: true,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(3),
      collectedAt: daysAgo(3),
      verifiedAt: null,
    },
    {
      requestCode: "ECO-2026-1010",
      citizenId: userMap.citizen,
      assignedPartnerId: userMap.partner,
      collectionCenterId: centerMap["MH-PUN-DEMO-06"],
      batchId: batchDocumented.id,
      status: "documented" as const,
      items: [
        {
          category: "Circuit Boards",
          quantity: 10,
          estimatedUnitWeightKg: 0.45,
          estimatedTotalWeightKg: 4.5,
          aiPredictedCategory: "Circuit Boards",
          aiConfidence: 0.82,
          userCorrected: false,
        },
        {
          category: "Other Electronic Waste",
          quantity: 4,
          estimatedUnitWeightKg: 1.5,
          estimatedTotalWeightKg: 6.0,
          aiPredictedCategory: "Other Electronic Waste",
          aiConfidence: 0.74,
          userCorrected: false,
        },
      ],
      requestedTotalQty: 14,
      estimatedWeightKg: 10.5,
      actualCollectedQty: 14,
      actualCollectedWeightKg: 11.2,
      aiClassificationMode: "demo_mode",
      pickupAddress: "Hinjewadi Phase 1 Demo Campus, Pune, Maharashtra",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411057",
      preferredDate: daysAgo(62).toISOString().slice(0, 10),
      preferredTimeSlot: "09:00 AM - 12:00 PM",
      citizenNotes: "Robotics lab spare motherboards and routers.",
      partnerNotes: "Weighed and logged cleanly.",
      discrepancyFlag: false,
      isDemoRecord: true,
      createdAt: daysAgo(65),
      updatedAt: daysAgo(50),
      collectedAt: daysAgo(62),
      verifiedAt: daysAgo(60),
    },
  ];

  const insertedRequests = await db
    .insert(pickupRequests)
    .values(requestsSeed)
    .returning();

  // 5. Seed Complete Traceability Timeline Events
  const eventsToInsert: (typeof traceabilityEvents.$inferInsert)[] = [];
  for (const req of insertedRequests) {
    eventsToInsert.push({
      requestId: req.id,
      batchId: req.batchId,
      stage: "submitted",
      title: "E-Waste Pickup Request Submitted",
      description: `Citizen submitted ${req.requestedTotalQty} item(s) with an estimated weight of ${req.estimatedWeightKg.toFixed(2)} kg (estimate only; physical weight recorded on collection).`,
      actorId: req.citizenId,
      actorName: req.citizenId === userMap.citizen ? "Aarav Sharma" : "Vikram Malhotra",
      actorRole: req.citizenId === userMap.citizen ? "citizen" : "organization",
      location: `${req.city}, ${req.state}`,
      createdAt: req.createdAt,
    });

    if (req.assignedPartnerId) {
      eventsToInsert.push({
        requestId: req.id,
        batchId: req.batchId,
        stage: "assigned",
        title: "Collection Partner & Hub Assigned",
        description: `Assigned to GreenRoute Demo Logistics for scheduled pickup in ${req.city}.`,
        actorId: userMap.admin,
        actorName: "Ananya Verma",
        actorRole: "admin",
        location: `${req.city}, ${req.state}`,
        createdAt: new Date(req.createdAt.getTime() + 6 * 60 * 60 * 1000),
      });
    }

    if (req.collectedAt && req.actualCollectedWeightKg != null) {
      eventsToInsert.push({
        requestId: req.id,
        batchId: req.batchId,
        stage: "collected",
        title: "Physical Collection & Actual Weight Recorded",
        description: `Collected ${req.actualCollectedQty} item(s). Measured physical weight: ${req.actualCollectedWeightKg.toFixed(2)} kg (material collected, not yet recycled).`,
        actorId: userMap.partner,
        actorName: "Gurpreet Singh",
        actorRole: "partner",
        location: `${req.city}, ${req.state}`,
        createdAt: req.collectedAt,
      });
    }

    if (req.verifiedAt) {
      eventsToInsert.push({
        requestId: req.id,
        batchId: req.batchId,
        stage: "verified",
        title: "Collection Center Verification Completed",
        description: `Weight & item manifest verified at demonstration collection center.`,
        actorId: userMap.center_manager,
        actorName: "Simran Kaur",
        actorRole: "center_manager",
        location: `${req.city}, ${req.state}`,
        createdAt: req.verifiedAt,
      });
    }

    if (req.batchId) {
      eventsToInsert.push({
        requestId: req.id,
        batchId: req.batchId,
        stage: "batched",
        title: "Consolidated Into Recycling Batch",
        description: `Added to outbound recycling batch for traceable facility handover.`,
        actorId: userMap.center_manager,
        actorName: "Simran Kaur",
        actorRole: "center_manager",
        location: "EcoTrace Hub",
        createdAt: new Date((req.verifiedAt ?? req.createdAt).getTime() + 12 * 60 * 60 * 1000),
      });
    }

    if (["received_by_recycler", "processing", "documented"].includes(req.status)) {
      eventsToInsert.push({
        requestId: req.id,
        batchId: req.batchId,
        stage: "received_by_recycler",
        title: "Recycler Gate Receipt Confirmed",
        description: `CircularTech Material Recovery Demo Unit confirmed physical receipt and logged weighbridge intake.`,
        actorId: userMap.recycler,
        actorName: "Dr. Meera Nair",
        actorRole: "recycler",
        location: "Mohali, Punjab (Demo Unit)",
        createdAt: new Date((req.verifiedAt ?? req.createdAt).getTime() + 36 * 60 * 60 * 1000),
      });
    }

    if (["processing", "documented"].includes(req.status)) {
      eventsToInsert.push({
        requestId: req.id,
        batchId: req.batchId,
        stage: "processing",
        title: "Dismantling & Material Recovery Started",
        description: `Hazardous components isolated; metals, plastics, glass, and PCBs separated for recovery.`,
        actorId: userMap.recycler,
        actorName: "Dr. Meera Nair",
        actorRole: "recycler",
        location: "Mohali, Punjab (Demo Unit)",
        createdAt: new Date((req.verifiedAt ?? req.createdAt).getTime() + 60 * 60 * 60 * 1000),
      });
    }

    if (req.status === "documented") {
      eventsToInsert.push({
        requestId: req.id,
        batchId: req.batchId,
        stage: "documented",
        title: "Recycling Documentation Logged",
        description: `Processing completed with weighbridge receipt & dismantling log attached. Note: Internal demonstration record, not a statutory CPCB credit.`,
        actorId: userMap.recycler,
        actorName: "Dr. Meera Nair",
        actorRole: "recycler",
        location: "Mohali, Punjab (Demo Unit)",
        createdAt: req.updatedAt,
      });
    }
  }

  await db.insert(traceabilityEvents).values(eventsToInsert);

  // 6. Seed EPR Traceability Records (strictly distinguishing stages, never fabricating statutory credits)
  await db.insert(eprRecords).values([
    {
      recordCode: "EPR-TRACE-2026-001",
      organizationId: userMap.organization,
      batchId: batchDocumented.id,
      reportingPeriod: "FY 2025-26 Q4",
      category: "IT & Telecom Equipment (Mixed)",
      requestedQty: 19,
      estimatedWeightKg: 43.81,
      actualCollectedWeightKg: 42.6,
      recyclerReceivedWeightKg: 42.2,
      processedQty: 19,
      documentedRecyclingKg: 39.8,
      supportingDocsCount: 2,
      verificationStatus: "verified_internal",
      notes:
        "Internal demonstration traceability summary. Supporting weighment and dismantling records verified internally; does not constitute a statutory CPCB EPR credit certificate.",
      createdAt: daysAgo(15),
    },
    {
      recordCode: "EPR-TRACE-2026-002",
      organizationId: userMap.organization,
      batchId: batchProcessing.id,
      reportingPeriod: "FY 2025-26 Q4",
      category: "Consumer Electronics & Batteries",
      requestedQty: 14,
      estimatedWeightKg: 27.8,
      actualCollectedWeightKg: 31.4,
      recyclerReceivedWeightKg: 31.1,
      processedQty: 8,
      documentedRecyclingKg: 0,
      supportingDocsCount: 1,
      verificationStatus: "draft_record",
      notes:
        "Material currently in dismantling phase. Recycling mass remains 0 kg until final processing documentation is verified.",
      createdAt: daysAgo(7),
    },
    {
      recordCode: "EPR-TRACE-2026-003",
      organizationId: userMap.organization,
      batchId: batchDiscrepancy.id,
      reportingPeriod: "FY 2025-26 Q4",
      category: "Laptops (Corporate Decommission)",
      requestedQty: 12,
      estimatedWeightKg: 25.2,
      actualCollectedWeightKg: 28.5,
      recyclerReceivedWeightKg: 23.1,
      processedQty: 0,
      documentedRecyclingKg: 0,
      supportingDocsCount: 1,
      verificationStatus: "discrepancy_flagged",
      notes:
        "Flagged for human audit: 5.4 kg shortfall between collection hub dispatch and recycler gate receipt.",
      createdAt: daysAgo(5),
    },
  ]);

  // 7. Seed Notifications
  await db.insert(notifications).values([
    {
      userId: userMap.citizen,
      title: "Recycling Documentation Ready (ECO-2026-1001)",
      message:
        "Your e-waste pickup ECO-2026-1001 (6.4 kg verified) completed recycling documentation under batch BATCH-2026-PB01.",
      type: "success",
      relatedUrl: "/dashboard/citizen",
      isRead: false,
    },
    {
      userId: userMap.citizen,
      title: "Pickup Scheduled for Chandigarh Request",
      message:
        "Collection partner Gurpreet Singh is scheduled for request ECO-2026-1007 (09:00 AM - 12:00 PM).",
      type: "info",
      relatedUrl: "/dashboard/citizen",
      isRead: false,
    },
    {
      userId: userMap.recycler,
      title: "Incoming Batch Dispatched: BATCH-2026-PB03",
      message:
        "11 items (18.9 kg dispatched) from EcoTrace Punjab Demonstration Drop-Off Hub await gate receipt confirmation.",
      type: "info",
      relatedUrl: "/dashboard/recycler",
      isRead: false,
    },
    {
      userId: userMap.recycler,
      title: "Weight Discrepancy Flagged on BATCH-2026-KA04",
      message:
        "Gate weight variance (-18.9%) has been escalated for administrative review.",
      type: "alert",
      relatedUrl: "/dashboard/recycler",
      isRead: false,
    },
    {
      userId: userMap.admin,
      title: "2 Discrepancy Alerts Require Review",
      message:
        "Request ECO-2026-1009 (quantity mismatch) and Batch BATCH-2026-KA04 (5.4 kg shortfall) are flagged for review.",
      type: "warning",
      relatedUrl: "/dashboard/admin",
      isRead: false,
    },
    {
      userId: userMap.partner,
      title: "Scheduled Pickup Ready: ECO-2026-1007",
      message:
        "Remember to record actual physical weight on-site before updating status to Collected.",
      type: "info",
      relatedUrl: "/dashboard/partner",
      isRead: false,
    },
  ]);

  // 8. Seed Audit Logs
  await db.insert(auditLogs).values([
    {
      actorId: userMap.admin,
      actorEmail: "admin@ecotrace.demo",
      actorRole: "admin",
      action: "CENTER_REGISTERED",
      entityType: "collection_center",
      entityId: "PB-LDH-DEMO-01",
      details: {
        name: "EcoTrace Punjab Demonstration Drop-Off Hub (Ludhiana)",
        isDemoSample: true,
      },
      createdAt: daysAgo(30),
    },
    {
      actorId: userMap.recycler,
      actorEmail: "recycler@ecotrace.demo",
      actorRole: "recycler",
      action: "BATCH_DOCUMENTED",
      entityType: "recycling_batch",
      entityId: "BATCH-2026-PB01",
      details: {
        receivedWeightKg: 42.2,
        documentedRecyclingKg: 39.8,
      },
      createdAt: daysAgo(15),
    },
    {
      actorId: userMap.recycler,
      actorEmail: "recycler@ecotrace.demo",
      actorRole: "recycler",
      action: "DISCREPANCY_FLAGGED",
      entityType: "recycling_batch",
      entityId: "BATCH-2026-KA04",
      details: {
        dispatchedWeightKg: 28.5,
        receivedWeightKg: 23.1,
        variancePercent: -18.95,
      },
      createdAt: daysAgo(5),
    },
    {
      actorId: userMap.partner,
      actorEmail: "partner@ecotrace.demo",
      actorRole: "partner",
      action: "COLLECTION_RECORDED",
      entityType: "pickup_request",
      entityId: "ECO-2026-1009",
      details: {
        requestedQty: 4,
        actualCollectedQty: 3,
        actualCollectedWeightKg: 13.8,
        discrepancyFlag: true,
      },
      createdAt: daysAgo(3),
    },
  ]);

  // 9. Seed Platform Settings
  const defaultSettings = [
    {
      key: "coverage_boundaries",
      value: {
        mode: "demonstration_zones",
        disclaimer:
          "Service coverage shown represents configured demonstration pilot regions only — not nationwide coverage.",
        regions: DEMO_COVERAGE_AREAS,
      },
      description: "Configured demonstration collection coverage boundaries",
      updatedBy: userMap.admin,
    },
    {
      key: "discrepancy_thresholds",
      value: {
        weightVariancePercentThreshold: 10,
        requireHumanReviewOnQtyMismatch: true,
        autoConvertToStatutoryEprCredit: false,
      },
      description: "Thresholds triggering human review alerts for weight or quantity variance",
      updatedBy: userMap.admin,
    },
    {
      key: "ai_classification_policy",
      value: {
        neverClaimExactPhysicalWeight: true,
        requirePhysicalWeighmentAtPickup: true,
        allowUserCorrection: true,
      },
      description: "AI transparency and weight separation guardrails",
      updatedBy: userMap.admin,
    },
  ];

  for (const setting of defaultSettings) {
    await db
      .insert(platformSettings)
      .values(setting)
      .onConflictDoNothing();
  }

  await seedMarketplaceAndHubs();
}
