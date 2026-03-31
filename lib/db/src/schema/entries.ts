import { pgTable, text, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ledgersTable } from "./ledgers";

export const entriesTable = pgTable("entries", {
  id: text("id").primaryKey(),
  ledgerId: text("ledger_id").notNull().references(() => ledgersTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // stored as YYYY-MM-DD string
  remark: text("remark").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  type: text("type", { enum: ["credit", "debit", "transfer"] }).notNull(),
  transferToLedgerId: text("transfer_to_ledger_id").references(() => ledgersTable.id),
  linkedTransferId: text("linked_transfer_id"),
  fifoRemaining: numeric("fifo_remaining", { precision: 15, scale: 2 }),
  balance: numeric("balance", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("entries_ledger_id_idx").on(table.ledgerId),
  index("entries_date_idx").on(table.date),
]);

export const insertEntrySchema = createInsertSchema(entriesTable).omit({
  createdAt: true,
});

export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type Entry = typeof entriesTable.$inferSelect;
