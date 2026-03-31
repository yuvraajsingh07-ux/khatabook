import { pgTable, text, boolean, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ledgerProfileSchema = z.object({
  phone: z.string().nullable().optional(),
  upiId: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  ifsc: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type LedgerProfile = z.infer<typeof ledgerProfileSchema>;

export const ledgersTable = pgTable("ledgers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fifoEnabled: boolean("fifo_enabled").notNull().default(false),
  profile: jsonb("profile").$type<LedgerProfile>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLedgerSchema = createInsertSchema(ledgersTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertLedger = z.infer<typeof insertLedgerSchema>;
export type Ledger = typeof ledgersTable.$inferSelect;
