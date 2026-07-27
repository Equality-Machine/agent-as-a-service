// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
export {};
import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const runners = sqliteTable("runners", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  kind: text("kind").notNull().default("local"),
  label: text("label").notNull().default(""),
  status: text("status").notNull().default("online"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  versionId: text("version_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  provider: text("provider").notNull(),
  executionMode: text("execution_mode").notNull().default("local"),
  runnerId: text("runner_id").notNull(),
  sourceHandle: text("source_handle").notNull(),
  sourceDigest: text("source_digest").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  agentVersionId: text("agent_version_id").notNull(),
  runtimeSessionId: text("runtime_session_id"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  agentId: text("agent_id").notNull(),
  runnerId: text("runner_id").notNull(),
  input: text("input").notNull(),
  output: text("output"),
  error: text("error"),
  status: text("status").notNull().default("queued"),
  leaseToken: text("lease_token"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  claimedAt: text("claimed_at"),
  completedAt: text("completed_at"),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
