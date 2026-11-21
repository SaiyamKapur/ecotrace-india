CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer,
	"actor_email" varchar(255),
	"actor_role" varchar(50),
	"action" varchar(120) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" varchar(120),
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(16) NOT NULL,
	"content" text NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"source" varchar(60),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_centers" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"city" varchar(120) NOT NULL,
	"state" varchar(120) NOT NULL,
	"district" varchar(120),
	"address" text NOT NULL,
	"pincode" varchar(20),
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"accepted_categories" jsonb NOT NULL,
	"operating_hours" varchar(255) NOT NULL,
	"contact_phone" varchar(40),
	"contact_email" varchar(255),
	"verification_label" varchar(255) NOT NULL,
	"is_demo_sample" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"manager_id" integer,
	"capacity_kg" double precision DEFAULT 2000 NOT NULL,
	"current_load_kg" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collection_centers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "epr_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_code" varchar(64) NOT NULL,
	"organization_id" integer,
	"batch_id" integer,
	"reporting_period" varchar(64) NOT NULL,
	"category" varchar(120) NOT NULL,
	"requested_qty" integer DEFAULT 0 NOT NULL,
	"estimated_weight_kg" double precision DEFAULT 0 NOT NULL,
	"actual_collected_weight_kg" double precision DEFAULT 0 NOT NULL,
	"recycler_received_weight_kg" double precision DEFAULT 0 NOT NULL,
	"processed_qty" integer DEFAULT 0 NOT NULL,
	"documented_recycling_kg" double precision DEFAULT 0 NOT NULL,
	"supporting_docs_count" integer DEFAULT 0 NOT NULL,
	"verification_status" varchar(64) DEFAULT 'draft_record' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "epr_records_record_code_unique" UNIQUE("record_code")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(32) DEFAULT 'info' NOT NULL,
	"related_url" varchar(255),
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pickup_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_code" varchar(64) NOT NULL,
	"citizen_id" integer NOT NULL,
	"assigned_partner_id" integer,
	"collection_center_id" integer,
	"batch_id" integer,
	"status" varchar(50) DEFAULT 'submitted' NOT NULL,
	"items" jsonb NOT NULL,
	"requested_total_qty" integer NOT NULL,
	"estimated_weight_kg" double precision NOT NULL,
	"actual_collected_qty" integer,
	"actual_collected_weight_kg" double precision,
	"image_data_url" text,
	"ai_classification_mode" varchar(64) DEFAULT 'manual',
	"ai_raw_summary" jsonb,
	"pickup_address" text NOT NULL,
	"city" varchar(120) NOT NULL,
	"state" varchar(120) NOT NULL,
	"pincode" varchar(20),
	"preferred_date" varchar(40) NOT NULL,
	"preferred_time_slot" varchar(80) NOT NULL,
	"citizen_notes" text,
	"partner_notes" text,
	"discrepancy_flag" boolean DEFAULT false NOT NULL,
	"discrepancy_reason" text,
	"is_demo_record" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"collected_at" timestamp,
	"verified_at" timestamp,
	CONSTRAINT "pickup_requests_request_code_unique" UNIQUE("request_code")
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"key" varchar(120) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_code" varchar(64) NOT NULL,
	"owner_id" integer NOT NULL,
	"request_id" integer,
	"title" varchar(180) NOT NULL,
	"brand" varchar(100),
	"model" varchar(120),
	"category" varchar(120) NOT NULL,
	"condition" varchar(30) NOT NULL,
	"quantity" integer NOT NULL,
	"image_url" text NOT NULL,
	"description" text,
	"city" varchar(120) NOT NULL,
	"state" varchar(120) NOT NULL,
	"indicative_value_paise" integer DEFAULT 0 NOT NULL,
	"offered_amount_paise" integer,
	"status" varchar(32) DEFAULT 'listed' NOT NULL,
	"quote_notes" text,
	"is_demo_record" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"quoted_at" timestamp,
	"accepted_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_listings_listing_code_unique" UNIQUE("listing_code")
);
--> statement-breakpoint
CREATE TABLE "recycling_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_code" varchar(64) NOT NULL,
	"collection_center_id" integer,
	"recycler_id" integer,
	"status" varchar(50) DEFAULT 'created' NOT NULL,
	"dispatched_qty" integer DEFAULT 0 NOT NULL,
	"dispatched_weight_kg" double precision DEFAULT 0 NOT NULL,
	"received_weight_kg" double precision,
	"accepted_qty" integer,
	"rejected_qty" integer,
	"processed_qty" integer,
	"documented_recycling_kg" double precision,
	"recovery_breakdown" jsonb,
	"supporting_documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"epr_review_status" varchar(64) DEFAULT 'pending_documentation' NOT NULL,
	"discrepancy_flag" boolean DEFAULT false NOT NULL,
	"discrepancy_notes" text,
	"processing_notes" text,
	"is_demo_record" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"received_at" timestamp,
	"processed_at" timestamp,
	"documented_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recycling_batches_batch_code_unique" UNIQUE("batch_code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "settlement_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"statement_code" varchar(64) NOT NULL,
	"listing_id" integer NOT NULL,
	"owner_id" integer NOT NULL,
	"request_id" integer,
	"quoted_amount_paise" integer NOT NULL,
	"final_amount_paise" integer NOT NULL,
	"status" varchar(32) DEFAULT 'pending_approval' NOT NULL,
	"method" varchar(60) DEFAULT 'demo_wallet' NOT NULL,
	"payout_reference" varchar(100),
	"adjustment_reason" text,
	"notes" text,
	"is_demo_record" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	"credited_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settlement_records_statement_code_unique" UNIQUE("statement_code"),
	CONSTRAINT "settlement_records_listing_id_unique" UNIQUE("listing_id")
);
--> statement-breakpoint
CREATE TABLE "traceability_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer,
	"batch_id" integer,
	"stage" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"actor_id" integer,
	"actor_name" varchar(255),
	"actor_role" varchar(50),
	"location" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'citizen' NOT NULL,
	"phone" varchar(40),
	"city" varchar(120),
	"state" varchar(120),
	"address" text,
	"organization_name" varchar(255),
	"green_points" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_demo_account" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_centers" ADD CONSTRAINT "collection_centers_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "epr_records" ADD CONSTRAINT "epr_records_organization_id_users_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "epr_records" ADD CONSTRAINT "epr_records_batch_id_recycling_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."recycling_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_citizen_id_users_id_fk" FOREIGN KEY ("citizen_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_assigned_partner_id_users_id_fk" FOREIGN KEY ("assigned_partner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_collection_center_id_collection_centers_id_fk" FOREIGN KEY ("collection_center_id") REFERENCES "public"."collection_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_batch_id_recycling_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."recycling_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_listings" ADD CONSTRAINT "product_listings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_listings" ADD CONSTRAINT "product_listings_request_id_pickup_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."pickup_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recycling_batches" ADD CONSTRAINT "recycling_batches_collection_center_id_collection_centers_id_fk" FOREIGN KEY ("collection_center_id") REFERENCES "public"."collection_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recycling_batches" ADD CONSTRAINT "recycling_batches_recycler_id_users_id_fk" FOREIGN KEY ("recycler_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_records" ADD CONSTRAINT "settlement_records_listing_id_product_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."product_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_records" ADD CONSTRAINT "settlement_records_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_records" ADD CONSTRAINT "settlement_records_request_id_pickup_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."pickup_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traceability_events" ADD CONSTRAINT "traceability_events_request_id_pickup_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."pickup_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traceability_events" ADD CONSTRAINT "traceability_events_batch_id_recycling_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."recycling_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traceability_events" ADD CONSTRAINT "traceability_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;