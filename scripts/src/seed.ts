import { db } from "@workspace/db";
import { ledgersTable, entriesTable } from "@workspace/db/schema";
import { randomUUID } from "crypto";

async function seed() {
  console.log("Seeding database...");

  // Check if already seeded
  const existing = await db.select().from(ledgersTable).limit(1);
  if (existing.length > 0) {
    console.log("Database already seeded. Skipping.");
    process.exit(0);
  }

  // Create sample ledgers
  const leelu = { id: randomUUID(), name: "Leelu Fauji", fifoEnabled: true, profile: { phone: "9812345678", upiId: "leelu@paytm", bankAccount: "1234567890", ifsc: "HDFC0001234", notes: "Regular customer, big orders" } };
  const faruk = { id: randomUUID(), name: "Faruk Ratol", fifoEnabled: false, profile: { phone: "9876543210", upiId: "faruk.ratol@upi", bankAccount: null, ifsc: null, notes: null } };
  const sunita = { id: randomUUID(), name: "Sunita Devi", fifoEnabled: false, profile: { phone: null, upiId: null, bankAccount: null, ifsc: null, notes: "Pays on time" } };

  await db.insert(ledgersTable).values([leelu, faruk, sunita]);

  // Entries for Leelu (FIFO enabled - bills and payments)
  const leeluEntries = [
    { id: randomUUID(), ledgerId: leelu.id, date: "2026-03-01", remark: "Bill 38 (10 bag wheat)", amount: "12500", type: "debit" as const, balance: "-12500" },
    { id: randomUUID(), ledgerId: leelu.id, date: "2026-03-05", remark: "Payment received", amount: "5000", type: "credit" as const, balance: "-7500" },
    { id: randomUUID(), ledgerId: leelu.id, date: "2026-03-10", remark: "Bill 39 (8 bag rice)", amount: "9600", type: "debit" as const, balance: "-17100" },
    { id: randomUUID(), ledgerId: leelu.id, date: "2026-03-15", remark: "Payment received", amount: "10000", type: "credit" as const, balance: "-7100" },
    { id: randomUUID(), ledgerId: leelu.id, date: "2026-03-27", remark: "Bill 40 (13 bag faruk ratol)", amount: "18432", type: "debit" as const, balance: "-25532" },
  ];

  // Entries for Faruk
  const farukEntries = [
    { id: randomUUID(), ledgerId: faruk.id, date: "2026-03-03", remark: "Bill 22 (5 bag maida)", amount: "7500", type: "debit" as const, balance: "-7500" },
    { id: randomUUID(), ledgerId: faruk.id, date: "2026-03-18", remark: "Cash payment", amount: "7500", type: "credit" as const, balance: "0" },
    { id: randomUUID(), ledgerId: faruk.id, date: "2026-03-25", remark: "Bill 23 (6 bag atta)", amount: "8400", type: "debit" as const, balance: "-8400" },
  ];

  // Entries for Sunita (she owes nothing, we owe her refund)
  const sunitaEntries = [
    { id: randomUUID(), ledgerId: sunita.id, date: "2026-03-20", remark: "Advance payment received", amount: "15000", type: "credit" as const, balance: "15000" },
    { id: randomUUID(), ledgerId: sunita.id, date: "2026-03-28", remark: "Bill 10 (9 bag daal)", amount: "11700", type: "debit" as const, balance: "3300" },
  ];

  await db.insert(entriesTable).values([
    ...leeluEntries.map(e => ({ ...e, fifoRemaining: e.type === "debit" ? e.amount : null })),
    ...farukEntries.map(e => ({ ...e, fifoRemaining: null })),
    ...sunitaEntries.map(e => ({ ...e, fifoRemaining: null })),
  ]);

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
