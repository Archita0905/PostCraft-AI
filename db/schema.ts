import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export type Quality = {
  hook_score: number;
  readability: string;
  scannability: number;
  feedback: string;
};

export const drafts = pgTable(
  "drafts",
  {
    id: text().primaryKey(),
    sessionId: text("session_id").notNull(),
    title: text().notNull(),
    content: text().notNull(),
    category: text().notNull(),
    tone: text().notNull(),
    length: text().notNull(),
    language: text().notNull(),
    hashtags: jsonb().$type<string[]>().notNull().default([]),
    quality: jsonb().$type<Quality | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("drafts_session_updated_idx").on(t.sessionId, t.updatedAt)],
);
