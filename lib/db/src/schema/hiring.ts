import { pgTable, text, integer, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// Internal registry; the public product exposes only the four named domain objects.
export const hiringRecords = pgTable("hiring_records", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  ownerId: text("owner_id").notNull(),
  revision: integer("revision").notNull().default(1),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const hiringUploads = pgTable("hiring_uploads", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  objectPath: text("object_path").notNull(),
  revision: integer("revision").notNull().default(1),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const hiringRequests = pgTable("hiring_requests", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  requestKey: text("request_key").notNull(),
  digest: text("digest").notNull(),
  result: jsonb("result").notNull(),
}, table => [uniqueIndex("hiring_request_owner_key").on(table.ownerId, table.requestKey)]);
export const hiringJobs = pgTable("hiring_jobs", {
  id: text("id").primaryKey(),
  uploadId: text("upload_id").notNull().unique(),
  state: text("state").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  inputHash: text("input_hash").notNull(),
  leaseToken: text("lease_token"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const hiringDeletionRequests = pgTable("hiring_deletion_requests", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  uploadId: text("upload_id").notNull(),
  state: text("state").notNull().default("requested"),
  attempts: integer("attempts").notNull().default(0),
  errorCode: text("error_code"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
