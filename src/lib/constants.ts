import type { BatchStatus, PickupStatus, UserRole } from "@/db/schema";

export interface EwasteCategoryMeta {
  id: string;
  label: string;
  estimatedUnitWeightKg: number;
  hazardLevel: "Low" | "Medium" | "High";
  recyclableMaterials: string;
  color: string;
  keywords: string[];
}

export const EWASTE_CATEGORIES: EwasteCategoryMeta[] = [
  {
    id: "Mobile Phones",
    label: "Mobile Phones",
    estimatedUnitWeightKg: 0.19,
    hazardLevel: "High",
    recyclableMaterials: "Lithium, Cobalt, Copper, Gold, Glass",
    color: "#10b981",
    keywords: ["phone", "mobile", "smartphone", "iphone", "android", "handset", "cell"],
  },
  {
    id: "Laptops",
    label: "Laptops",
    estimatedUnitWeightKg: 2.1,
    hazardLevel: "High",
    recyclableMaterials: "Aluminum, Copper, Gold, Lithium-Ion Battery, PCB",
    color: "#059669",
    keywords: ["laptop", "macbook", "notebook", "ultrabook", "thinkpad", "computer"],
  },
  {
    id: "Tablets",
    label: "Tablets",
    estimatedUnitWeightKg: 0.52,
    hazardLevel: "Medium",
    recyclableMaterials: "Aluminum, Glass, Lithium Battery, Rare Earths",
    color: "#14b8a6",
    keywords: ["tablet", "ipad", "tab", "slate", "ereader"],
  },
  {
    id: "Monitors",
    label: "Monitors",
    estimatedUnitWeightKg: 4.8,
    hazardLevel: "High",
    recyclableMaterials: "Glass, Steel, Copper, LED Backlight, Plastics",
    color: "#0ea5e9",
    keywords: ["monitor", "display", "screen", "lcd", "led", "desktop"],
  },
  {
    id: "Keyboards",
    label: "Keyboards",
    estimatedUnitWeightKg: 0.75,
    hazardLevel: "Low",
    recyclableMaterials: "ABS Plastic, Steel Plate, Copper Membrane",
    color: "#6366f1",
    keywords: ["keyboard", "keypad", "mechanical"],
  },
  {
    id: "Mice",
    label: "Mice",
    estimatedUnitWeightKg: 0.12,
    hazardLevel: "Low",
    recyclableMaterials: "ABS Plastic, Small PCB, Copper Wire",
    color: "#8b5cf6",
    keywords: ["mouse", "mice", "trackpad", "pointer"],
  },
  {
    id: "Printers",
    label: "Printers",
    estimatedUnitWeightKg: 6.5,
    hazardLevel: "Medium",
    recyclableMaterials: "Steel, Copper Motors, Plastics, Circuitry",
    color: "#f59e0b",
    keywords: ["printer", "scanner", "copier", "inkjet", "laserjet"],
  },
  {
    id: "Chargers and Cables",
    label: "Chargers and Cables",
    estimatedUnitWeightKg: 0.22,
    hazardLevel: "Low",
    recyclableMaterials: "Copper Wire, PVC Insulation, Transformer Core",
    color: "#f97316",
    keywords: ["charger", "cable", "adapter", "wire", "cord", "usb", "power"],
  },
  {
    id: "Batteries",
    label: "Batteries",
    estimatedUnitWeightKg: 0.35,
    hazardLevel: "High",
    recyclableMaterials: "Lithium, Cobalt, Nickel, Manganese, Steel Casing",
    color: "#ef4444",
    keywords: ["battery", "batteries", "cell", "powerbank", "ups", "lithium"],
  },
  {
    id: "Circuit Boards",
    label: "Circuit Boards",
    estimatedUnitWeightKg: 0.45,
    hazardLevel: "High",
    recyclableMaterials: "Gold, Silver, Palladium, Copper, Fiberglass",
    color: "#047857",
    keywords: ["circuit", "pcb", "motherboard", "board", "chip", "ram", "gpu", "cpu"],
  },
  {
    id: "Televisions",
    label: "Televisions",
    estimatedUnitWeightKg: 11.5,
    hazardLevel: "High",
    recyclableMaterials: "Glass Panel, Aluminum Frame, Copper Coils, Plastics",
    color: "#0284c7",
    keywords: ["television", "tv", "smarttv", "oled", "crt"],
  },
  {
    id: "Other Electronic Waste",
    label: "Other Electronic Waste",
    estimatedUnitWeightKg: 1.5,
    hazardLevel: "Medium",
    recyclableMaterials: "Mixed Metals, Plastics, Electronic Sub-Assemblies",
    color: "#64748b",
    keywords: ["router", "speaker", "headphone", "camera", "gadget", "electronics", "ewaste", "other"],
  },
];

export const CATEGORY_MAP: Record<string, EwasteCategoryMeta> = Object.fromEntries(
  EWASTE_CATEGORIES.map((c) => [c.id, c])
);

export function getEstimatedUnitWeight(category: string): number {
  return CATEGORY_MAP[category]?.estimatedUnitWeightKg ?? 1.5;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  citizen: "Citizen",
  partner: "Collection Partner",
  recycler: "Recycler",
  organization: "Organization / Producer",
  center_manager: "Center Manager",
  admin: "Administrator",
};

export const ROLE_DASHBOARD_ROUTES: Record<UserRole, string> = {
  citizen: "/dashboard/citizen",
  partner: "/dashboard/partner",
  recycler: "/dashboard/recycler",
  organization: "/dashboard/organization",
  center_manager: "/dashboard/center",
  admin: "/dashboard/admin",
};

export const PICKUP_STATUS_META: Record<
  PickupStatus,
  { label: string; step: number; badgeClass: string; description: string }
> = {
  submitted: {
    label: "Submitted",
    step: 1,
    badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
    description: "Request submitted by citizen and awaiting administrative review.",
  },
  reviewed: {
    label: "Reviewed",
    step: 2,
    badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
    description: "Request reviewed by operations desk.",
  },
  assigned: {
    label: "Partner Assigned",
    step: 3,
    badgeClass: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
    description: "Assigned to a collection partner and destination hub.",
  },
  scheduled: {
    label: "Pickup Scheduled",
    step: 4,
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    description: "Collection window confirmed with citizen.",
  },
  collected: {
    label: "Collected (Pending Verification)",
    step: 5,
    badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
    description: "Physical items collected and weighed on-site; not yet recycled.",
  },
  verified: {
    label: "Collection Verified",
    step: 6,
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    description: "Actual collected weight and quantity verified at center.",
  },
  batched: {
    label: "Assigned to Recycling Batch",
    step: 7,
    badgeClass: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
    description: "Consolidated into a traceable outbound recycling batch.",
  },
  received_by_recycler: {
    label: "Received by Recycler",
    step: 8,
    badgeClass: "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300",
    description: "Recycler confirmed physical receipt and recorded gate weight.",
  },
  processing: {
    label: "Recycling in Progress",
    step: 9,
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    description: "Dismantling, sorting, and material recovery underway.",
  },
  documented: {
    label: "Recycling Documented",
    step: 10,
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    description: "Processing completed with supporting recycling documentation logged.",
  },
  cancelled: {
    label: "Cancelled",
    step: 0,
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    description: "Request cancelled before physical collection.",
  },
};

export const VALID_PICKUP_TRANSITIONS: Record<PickupStatus, PickupStatus[]> = {
  submitted: ["reviewed", "assigned", "scheduled", "cancelled"],
  reviewed: ["assigned", "scheduled", "cancelled"],
  assigned: ["scheduled", "collected", "cancelled"],
  scheduled: ["collected", "cancelled"],
  collected: ["verified"],
  verified: ["batched"],
  batched: ["received_by_recycler"],
  received_by_recycler: ["processing"],
  processing: ["documented"],
  documented: [],
  cancelled: [],
};

export const BATCH_STATUS_META: Record<
  BatchStatus,
  { label: string; badgeClass: string }
> = {
  created: {
    label: "Created",
    badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  },
  dispatched: {
    label: "Dispatched (Incoming)",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  received: {
    label: "Received at Facility",
    badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  },
  processing: {
    label: "Processing in Progress",
    badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  documented: {
    label: "Recycling Documented",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  discrepancy_review: {
    label: "Discrepancy Flagged",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  },
};

// Indicative sample guide only; not a buyback guarantee or physical weighment.
// Monetary amounts are stored as integer paise and require administrator review.
export const DEMO_UNIT_PRICE_PAISE: Record<string, number> = {
  "Mobile Phones": 45000,
  Laptops: 155000,
  Tablets: 65000,
  Monitors: 55000,
  Keyboards: 9000,
  Mice: 4000,
  Printers: 55000,
  "Chargers and Cables": 5000,
  Batteries: 8000,
  "Circuit Boards": 22000,
  Televisions: 75000,
  "Other Electronic Waste": 15000,
};

export type ProductCondition = "working" | "repairable" | "non_working";
export const PRODUCT_CONDITIONS: { id: ProductCondition; label: string; factor: number }[] = [
  { id: "working", label: "Working", factor: 1.6 },
  { id: "repairable", label: "Needs repair", factor: 1 },
  { id: "non_working", label: "Not working", factor: 0.55 },
];

export function indicativeValuePaise(category: string, condition: ProductCondition, quantity: number): number {
  const base = DEMO_UNIT_PRICE_PAISE[category] ?? DEMO_UNIT_PRICE_PAISE["Other Electronic Waste"];
  const factor = PRODUCT_CONDITIONS.find((p) => p.id === condition)?.factor ?? 1;
  return Math.round((base * factor * Math.max(1, Math.min(quantity, 100))) / 100) * 100;
}

export function formatINR(paise: number | null | undefined): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export const PRODUCT_IMAGE_BY_CATEGORY: Record<string, string> = {
  "Mobile Phones": "/images/listing-phone.jpg",
  Laptops: "/images/listing-laptop.jpg",
  Tablets: "/images/tablet-sample.jpg",
  Monitors: "/images/listing-monitor.jpg",
  Keyboards: "/images/listing-monitor.jpg",
  Mice: "/images/listing-monitor.jpg",
  Printers: "/images/listing-monitor.jpg",
  "Chargers and Cables": "/images/listing-cables.jpg",
  Batteries: "/images/listing-cables.jpg",
  "Circuit Boards": "/images/listing-cables.jpg",
  Televisions: "/images/listing-monitor.jpg",
  "Other Electronic Waste": "/images/listing-cables.jpg",
};

export const PLATFORM_CONTACT = {
  email: "infoecotrase@gmail.com",
  phone: "7087394940",
  phoneDisplay: "+91 70873 94940",
  phoneHref: "tel:+917087394940",
} as const;

export const DEMO_COVERAGE_AREAS = [
  {
    state: "Punjab",
    cities: ["Ludhiana", "Amritsar", "Jalandhar", "Phagwara", "Goraya", "Banga", "Kapurthala", "Hoshiarpur", "Mohali", "Patiala"],
    label: "Punjab pilot area — sample locations",
    hubCode: "PB-LDH-DEMO-01",
  },
  {
    state: "Chandigarh",
    cities: ["Chandigarh", "Panchkula"],
    label: "Sample region — Tri-City",
    hubCode: "CH-TRI-DEMO-02",
  },
  {
    state: "Delhi",
    cities: ["New Delhi", "Gurugram", "Noida"],
    label: "Sample region — Delhi NCR",
    hubCode: "DL-OKH-DEMO-03",
  },
  {
    state: "Karnataka",
    cities: ["Bengaluru"],
    label: "Sample region — Bengaluru",
    hubCode: "KA-BLR-DEMO-04",
  },
  {
    state: "Maharashtra",
    cities: ["Mumbai", "Pune"],
    label: "Sample region — Maharashtra",
    hubCode: "MH-MUM-DEMO-05",
  },
];

export const TIME_SLOTS = [
  "09:00 AM - 12:00 PM",
  "12:00 PM - 03:00 PM",
  "03:00 PM - 06:00 PM",
];
