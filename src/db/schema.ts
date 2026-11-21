import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export type UserRole =
  | "citizen"
  | "partner"
  | "recycler"
  | "organization"
  | "center_manager"
  | "admin";

export type PickupStatus =
  | "submitted"
  | "reviewed"
  | "assigned"
  | "scheduled"
  | "collected"
  | "verified"
  | "batched"
  | "received_by_recycler"
  | "processing"
  | "documented"
  | "cancelled";

export type BatchStatus =
  | "created"
  | "dispatched"
  | "received"
  | "processing"
  | "documented"
  | "discrepancy_review";

export interface PickupItemRecord {
  category: string;
  quantity: number;
  estimatedUnitWeightKg: number;
  estimatedTotalWeightKg: number;
  aiPredictedCategory?: string;
  aiConfidence?: number | null;
  userCorrected?: boolean;
  notes?: string;
}

export interface SupportingDocumentRecord {
  id: string;
  title: string;
  docType: string;
  referenceNo: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
}

export interface RecoveryBreakdown {
  metalsKg: number;
  plasticsKg: number;
  glassKg: number;
  circuitBoardsKg: number;
  hazardousDivertedKg: number;
}

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).$type<UserRole>().notNull().default("citizen"),
  phone: varchar("phone", { length: 40 }),
  city: varchar("city", { length: 120 }),
  state: varchar("state", { length: 120 }),
  address: text("address"),
  organizationName: varchar("organization_name", { length: 255 }),
  greenPoints: integer("green_points").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isDemoAccount: boolean("is_demo_account").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const collectionCenters = pgTable("collection_centers", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  state: varchar("state", { length: 120 }).notNull(),
  district: varchar("district", { length: 120 }),
  address: text("address").notNull(),
  pincode: varchar("pincode", { length: 20 }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  acceptedCategories: jsonb("accepted_categories").$type<string[]>().notNull(),
  operatingHours: varchar("operating_hours", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 40 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  verificationLabel: varchar("verification_label", { length: 255 }).notNull(),
  isDemoSample: boolean("is_demo_sample").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  managerId: integer("manager_id").references(() => users.id, {
    onDelete: "set null",
  }),
  capacityKg: doublePrecision("capacity_kg").notNull().default(2000),
  currentLoadKg: doublePrecision("current_load_kg").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recyclingBatches = pgTable("recycling_batches", {
  id: serial("id").primaryKey(),
  batchCode: varchar("batch_code", { length: 64 }).notNull().unique(),
  collectionCenterId: integer("collection_center_id").references(
    () => collectionCenters.id,
    { onDelete: "set null" }
  ),
  recyclerId: integer("recycler_id").references(() => users.id, {
    onDelete: "set null",
  }),
  status: varchar("status", { length: 50 })
    .$type<BatchStatus>()
    .notNull()
    .default("created"),
  dispatchedQty: integer("dispatched_qty").notNull().default(0),
  dispatchedWeightKg: doublePrecision("dispatched_weight_kg").notNull().default(0),
  receivedWeightKg: doublePrecision("received_weight_kg"),
  acceptedQty: integer("accepted_qty"),
  rejectedQty: integer("rejected_qty"),
  processedQty: integer("processed_qty"),
  documentedRecyclingKg: doublePrecision("documented_recycling_kg"),
  recoveryBreakdown: jsonb("recovery_breakdown").$type<RecoveryBreakdown | null>(),
  supportingDocuments: jsonb("supporting_documents")
    .$type<SupportingDocumentRecord[]>()
    .notNull()
    .default([]),
  eprReviewStatus: varchar("epr_review_status", { length: 64 })
    .notNull()
    .default("pending_documentation"),
  discrepancyFlag: boolean("discrepancy_flag").notNull().default(false),
  discrepancyNotes: text("discrepancy_notes"),
  processingNotes: text("processing_notes"),
  isDemoRecord: boolean("is_demo_record").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  receivedAt: timestamp("received_at"),
  processedAt: timestamp("processed_at"),
  documentedAt: timestamp("documented_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pickupRequests = pgTable("pickup_requests", {
  id: serial("id").primaryKey(),
  requestCode: varchar("request_code", { length: 64 }).notNull().unique(),
  citizenId: integer("citizen_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assignedPartnerId: integer("assigned_partner_id").references(() => users.id, {
    onDelete: "set null",
  }),
  collectionCenterId: integer("collection_center_id").references(
    () => collectionCenters.id,
    { onDelete: "set null" }
  ),
  batchId: integer("batch_id").references(() => recyclingBatches.id, {
    onDelete: "set null",
  }),
  status: varchar("status", { length: 50 })
    .$type<PickupStatus>()
    .notNull()
    .default("submitted"),
  items: jsonb("items").$type<PickupItemRecord[]>().notNull(),
  requestedTotalQty: integer("requested_total_qty").notNull(),
  estimatedWeightKg: doublePrecision("estimated_weight_kg").notNull(),
  actualCollectedQty: integer("actual_collected_qty"),
  actualCollectedWeightKg: doublePrecision("actual_collected_weight_kg"),
  imageDataUrl: text("image_data_url"),
  aiClassificationMode: varchar("ai_classification_mode", { length: 64 }).default(
    "manual"
  ),
  aiRawSummary: jsonb("ai_raw_summary").$type<Record<string, unknown> | null>(),
  pickupAddress: text("pickup_address").notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  state: varchar("state", { length: 120 }).notNull(),
  pincode: varchar("pincode", { length: 20 }),
  preferredDate: varchar("preferred_date", { length: 40 }).notNull(),
  preferredTimeSlot: varchar("preferred_time_slot", { length: 80 }).notNull(),
  citizenNotes: text("citizen_notes"),
  partnerNotes: text("partner_notes"),
  discrepancyFlag: boolean("discrepancy_flag").notNull().default(false),
  discrepancyReason: text("discrepancy_reason"),
  isDemoRecord: boolean("is_demo_record").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  collectedAt: timestamp("collected_at"),
  verifiedAt: timestamp("verified_at"),
});

export const traceabilityEvents = pgTable("traceability_events", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").references(() => pickupRequests.id, {
    onDelete: "cascade",
  }),
  batchId: integer("batch_id").references(() => recyclingBatches.id, {
    onDelete: "set null",
  }),
  stage: varchar("stage", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  actorId: integer("actor_id").references(() => users.id, {
    onDelete: "set null",
  }),
  actorName: varchar("actor_name", { length: 255 }),
  actorRole: varchar("actor_role", { length: 50 }),
  location: varchar("location", { length: 255 }),
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eprRecords = pgTable("epr_records", {
  id: serial("id").primaryKey(),
  recordCode: varchar("record_code", { length: 64 }).notNull().unique(),
  organizationId: integer("organization_id").references(() => users.id, {
    onDelete: "set null",
  }),
  batchId: integer("batch_id").references(() => recyclingBatches.id, {
    onDelete: "set null",
  }),
  reportingPeriod: varchar("reporting_period", { length: 64 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  requestedQty: integer("requested_qty").notNull().default(0),
  estimatedWeightKg: doublePrecision("estimated_weight_kg").notNull().default(0),
  actualCollectedWeightKg: doublePrecision("actual_collected_weight_kg")
    .notNull()
    .default(0),
  recyclerReceivedWeightKg: doublePrecision("recycler_received_weight_kg")
    .notNull()
    .default(0),
  processedQty: integer("processed_qty").notNull().default(0),
  documentedRecyclingKg: doublePrecision("documented_recycling_kg")
    .notNull()
    .default(0),
  supportingDocsCount: integer("supporting_docs_count").notNull().default(0),
  verificationStatus: varchar("verification_status", { length: 64 })
    .notNull()
    .default("draft_record"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 32 }).notNull().default("info"),
  relatedUrl: varchar("related_url", { length: 255 }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").references(() => users.id, {
    onDelete: "set null",
  }),
  actorEmail: varchar("actor_email", { length: 255 }),
  actorRole: varchar("actor_role", { length: 50 }),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: varchar("entity_id", { length: 120 }),
  details: jsonb("details").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const platformSettings = pgTable("platform_settings", {
  key: varchar("key", { length: 120 }).primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  description: text("description"),
  updatedBy: integer("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// The resale/collection quote flow is separate from weight and statutory EPR records.
// All amounts are INTEGER PAISE. No real bank transfer is performed by the sandbox.
export type ListingStatus =
  | "listed"
  | "quoted"
  | "accepted"
  | "pickup_booked"
  | "collected"
  | "verified"
  | "recycling"
  | "settlement_ready"
  | "paid"
  | "declined";

export type SettlementStatus = "pending_approval" | "approved" | "credited";

export const productListings = pgTable("product_listings", {
  id: serial("id").primaryKey(),
  listingCode: varchar("listing_code", { length: 64 }).notNull().unique(),
  ownerId: integer("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestId: integer("request_id").references(() => pickupRequests.id, { onDelete: "set null" }),
  title: varchar("title", { length: 180 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 120 }),
  category: varchar("category", { length: 120 }).notNull(),
  condition: varchar("condition", { length: 30 }).notNull(),
  quantity: integer("quantity").notNull(),
  imageUrl: text("image_url").notNull(),
  description: text("description"),
  city: varchar("city", { length: 120 }).notNull(),
  state: varchar("state", { length: 120 }).notNull(),
  indicativeValuePaise: integer("indicative_value_paise").notNull().default(0),
  offeredAmountPaise: integer("offered_amount_paise"),
  status: varchar("status", { length: 32 }).$type<ListingStatus>().notNull().default("listed"),
  quoteNotes: text("quote_notes"),
  isDemoRecord: boolean("is_demo_record").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  quotedAt: timestamp("quoted_at"),
  acceptedAt: timestamp("accepted_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const settlementRecords = pgTable("settlement_records", {
  id: serial("id").primaryKey(),
  statementCode: varchar("statement_code", { length: 64 }).notNull().unique(),
  listingId: integer("listing_id").notNull().unique().references(() => productListings.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestId: integer("request_id").references(() => pickupRequests.id, { onDelete: "set null" }),
  quotedAmountPaise: integer("quoted_amount_paise").notNull(),
  finalAmountPaise: integer("final_amount_paise").notNull(),
  status: varchar("status", { length: 32 }).$type<SettlementStatus>().notNull().default("pending_approval"),
  method: varchar("method", { length: 60 }).notNull().default("demo_wallet"),
  payoutReference: varchar("payout_reference", { length: 100 }),
  adjustmentReason: text("adjustment_reason"),
  notes: text("notes"),
  isDemoRecord: boolean("is_demo_record").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
  creditedAt: timestamp("credited_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 16 }).$type<"user" | "assistant">().notNull(),
  content: text("content").notNull(),
  language: varchar("language", { length: 10 }).notNull().default("en"),
  source: varchar("source", { length: 60 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
