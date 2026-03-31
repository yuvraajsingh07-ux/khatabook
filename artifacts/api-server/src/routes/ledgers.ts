import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ledgersTable, entriesTable } from "@workspace/db/schema";
import { eq, sql, desc, and, gte, lte, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// GET /ledgers — all ledgers with current balance
router.get("/", async (req, res) => {
  try {
    const ledgers = await db.select().from(ledgersTable).orderBy(asc(ledgersTable.name));

    const result = await Promise.all(ledgers.map(async (ledger) => {
      const stats = await db
        .select({
          totalCredit: sql<number>`COALESCE(SUM(CASE WHEN type = 'credit' THEN amount::numeric ELSE 0 END), 0)`,
          totalDebit: sql<number>`COALESCE(SUM(CASE WHEN type = 'debit' THEN amount::numeric ELSE 0 END), 0)`,
          entryCount: sql<number>`COUNT(*)`,
        })
        .from(entriesTable)
        .where(eq(entriesTable.ledgerId, ledger.id));

      const { totalCredit, totalDebit, entryCount } = stats[0];
      const balance = Number(totalCredit) - Number(totalDebit);

      return {
        ...ledger,
        balance,
        totalCredit: Number(totalCredit),
        totalDebit: Number(totalDebit),
        entryCount: Number(entryCount),
      };
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get ledgers");
    res.status(500).json({ error: "Failed to get ledgers" });
  }
});

// POST /ledgers — create ledger
router.post("/", async (req, res) => {
  try {
    const { name, fifoEnabled = false, profile } = req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }

    const [ledger] = await db.insert(ledgersTable).values({
      id: randomUUID(),
      name: name.trim(),
      fifoEnabled,
      profile: profile || null,
    }).returning();

    res.status(201).json(ledger);
  } catch (err) {
    req.log.error({ err }, "Failed to create ledger");
    res.status(500).json({ error: "Failed to create ledger" });
  }
});

// GET /ledgers/:ledgerId
router.get("/:ledgerId", async (req, res) => {
  try {
    const { ledgerId } = req.params;
    const [ledger] = await db.select().from(ledgersTable).where(eq(ledgersTable.id, ledgerId));

    if (!ledger) return res.status(404).json({ error: "Ledger not found" });

    const stats = await db
      .select({
        totalCredit: sql<number>`COALESCE(SUM(CASE WHEN type = 'credit' THEN amount::numeric ELSE 0 END), 0)`,
        totalDebit: sql<number>`COALESCE(SUM(CASE WHEN type = 'debit' THEN amount::numeric ELSE 0 END), 0)`,
        entryCount: sql<number>`COUNT(*)`,
      })
      .from(entriesTable)
      .where(eq(entriesTable.ledgerId, ledgerId));

    const { totalCredit, totalDebit, entryCount } = stats[0];
    const balance = Number(totalCredit) - Number(totalDebit);

    res.json({
      ...ledger,
      balance,
      totalCredit: Number(totalCredit),
      totalDebit: Number(totalDebit),
      entryCount: Number(entryCount),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get ledger");
    res.status(500).json({ error: "Failed to get ledger" });
  }
});

// PATCH /ledgers/:ledgerId
router.patch("/:ledgerId", async (req, res) => {
  try {
    const { ledgerId } = req.params;
    const { name, fifoEnabled, profile } = req.body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (fifoEnabled !== undefined) updates.fifoEnabled = fifoEnabled;
    if (profile !== undefined) updates.profile = profile;

    const [ledger] = await db.update(ledgersTable)
      .set(updates)
      .where(eq(ledgersTable.id, ledgerId))
      .returning();

    if (!ledger) return res.status(404).json({ error: "Ledger not found" });
    res.json(ledger);
  } catch (err) {
    req.log.error({ err }, "Failed to update ledger");
    res.status(500).json({ error: "Failed to update ledger" });
  }
});

// DELETE /ledgers/:ledgerId
router.delete("/:ledgerId", async (req, res) => {
  try {
    const { ledgerId } = req.params;
    await db.delete(ledgersTable).where(eq(ledgersTable.id, ledgerId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete ledger");
    res.status(500).json({ error: "Failed to delete ledger" });
  }
});

// GET /ledgers/:ledgerId/entries
router.get("/:ledgerId/entries", async (req, res) => {
  try {
    const { ledgerId } = req.params;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const conditions = [eq(entriesTable.ledgerId, ledgerId)];
    if (startDate) conditions.push(gte(entriesTable.date, startDate));
    if (endDate) conditions.push(lte(entriesTable.date, endDate));

    const entries = await db
      .select({
        id: entriesTable.id,
        ledgerId: entriesTable.ledgerId,
        date: entriesTable.date,
        remark: entriesTable.remark,
        amount: entriesTable.amount,
        type: entriesTable.type,
        transferToLedgerId: entriesTable.transferToLedgerId,
        linkedTransferId: entriesTable.linkedTransferId,
        fifoRemaining: entriesTable.fifoRemaining,
        balance: entriesTable.balance,
        createdAt: entriesTable.createdAt,
        transferToLedgerName: sql<string | null>`(SELECT name FROM ledgers WHERE id = ${entriesTable.transferToLedgerId})`,
      })
      .from(entriesTable)
      .where(and(...conditions))
      .orderBy(asc(entriesTable.date), asc(entriesTable.createdAt));

    const mapped = entries.map(e => ({
      ...e,
      amount: Number(e.amount),
      balance: Number(e.balance),
      fifoRemaining: e.fifoRemaining != null ? Number(e.fifoRemaining) : null,
    }));

    res.json(mapped);
  } catch (err) {
    req.log.error({ err }, "Failed to get entries");
    res.status(500).json({ error: "Failed to get entries" });
  }
});

// POST /ledgers/:ledgerId/entries
router.post("/:ledgerId/entries", async (req, res) => {
  try {
    const { ledgerId } = req.params;
    const { date, remark, amount, type, transferToLedgerId } = req.body;

    if (!date || !remark || amount == null || !type) {
      return res.status(400).json({ error: "date, remark, amount, type are required" });
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    // Get current balance for this ledger
    const [balRow] = await db.select({
      lastBalance: sql<string>`COALESCE(
        (SELECT balance FROM entries WHERE ledger_id = ${ledgerId} ORDER BY date DESC, created_at DESC LIMIT 1),
        '0'
      )`,
    }).from(ledgersTable).where(eq(ledgersTable.id, ledgerId));

    const currentBalance = Number(balRow?.lastBalance ?? 0);

    let newBalance: number;
    if (type === "credit") {
      newBalance = currentBalance + amountNum;
    } else if (type === "debit") {
      newBalance = currentBalance - amountNum;
    } else {
      // transfer: credit in current ledger
      newBalance = currentBalance + amountNum;
    }

    const entryId = randomUUID();
    const linkedTransferId = type === "transfer" ? randomUUID() : null;

    const [entry] = await db.insert(entriesTable).values({
      id: entryId,
      ledgerId,
      date,
      remark,
      amount: String(amountNum),
      type,
      transferToLedgerId: type === "transfer" ? transferToLedgerId : null,
      linkedTransferId,
      fifoRemaining: type === "debit" ? String(amountNum) : null,
      balance: String(newBalance),
    }).returning();

    // If transfer, also create a debit entry in the target ledger
    if (type === "transfer" && transferToLedgerId) {
      const [targetBalRow] = await db.select({
        lastBalance: sql<string>`COALESCE(
          (SELECT balance FROM entries WHERE ledger_id = ${transferToLedgerId} ORDER BY date DESC, created_at DESC LIMIT 1),
          '0'
        )`,
      }).from(ledgersTable).where(eq(ledgersTable.id, transferToLedgerId));

      const targetBalance = Number(targetBalRow?.lastBalance ?? 0);
      const targetNewBalance = targetBalance - amountNum;

      const [targetEntry] = await db.insert(entriesTable).values({
        id: randomUUID(),
        ledgerId: transferToLedgerId,
        date,
        remark,
        amount: String(amountNum),
        type: "transfer",
        transferToLedgerId: ledgerId,
        linkedTransferId: entryId,
        fifoRemaining: null,
        balance: String(targetNewBalance),
      }).returning();

      // Update the source entry's linkedTransferId to point to the target
      await db.update(entriesTable)
        .set({ linkedTransferId: targetEntry.id })
        .where(eq(entriesTable.id, entryId));

      return res.status(201).json([
        { ...entry, amount: Number(entry.amount), balance: Number(entry.balance), fifoRemaining: null, linkedTransferId: targetEntry.id },
        { ...targetEntry, amount: Number(targetEntry.amount), balance: Number(targetEntry.balance), fifoRemaining: null },
      ]);
    }

    res.status(201).json({
      ...entry,
      amount: Number(entry.amount),
      balance: Number(entry.balance),
      fifoRemaining: entry.fifoRemaining != null ? Number(entry.fifoRemaining) : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create entry");
    res.status(500).json({ error: "Failed to create entry" });
  }
});

// PATCH /ledgers/:ledgerId/entries/:entryId
router.patch("/:ledgerId/entries/:entryId", async (req, res) => {
  try {
    const { ledgerId, entryId } = req.params;
    const { date, remark, amount } = req.body;

    const updates: Record<string, unknown> = {};
    if (date !== undefined) updates.date = date;
    if (remark !== undefined) updates.remark = remark;
    if (amount !== undefined) updates.amount = String(Number(amount));

    const [entry] = await db.update(entriesTable)
      .set(updates)
      .where(and(eq(entriesTable.id, entryId), eq(entriesTable.ledgerId, ledgerId)))
      .returning();

    if (!entry) return res.status(404).json({ error: "Entry not found" });

    // Recalculate balances for all entries in this ledger after this one
    await recalculateBalances(ledgerId);

    const [updated] = await db.select().from(entriesTable).where(eq(entriesTable.id, entryId));
    res.json({
      ...updated,
      amount: Number(updated.amount),
      balance: Number(updated.balance),
      fifoRemaining: updated.fifoRemaining != null ? Number(updated.fifoRemaining) : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update entry");
    res.status(500).json({ error: "Failed to update entry" });
  }
});

// DELETE /ledgers/:ledgerId/entries/:entryId
router.delete("/:ledgerId/entries/:entryId", async (req, res) => {
  try {
    const { ledgerId, entryId } = req.params;
    await db.delete(entriesTable)
      .where(and(eq(entriesTable.id, entryId), eq(entriesTable.ledgerId, ledgerId)));

    await recalculateBalances(ledgerId);
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete entry");
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

// GET /ledgers/:ledgerId/summary
router.get("/:ledgerId/summary", async (req, res) => {
  try {
    const { ledgerId } = req.params;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const conditions = [eq(entriesTable.ledgerId, ledgerId)];
    if (startDate) conditions.push(gte(entriesTable.date, startDate));
    if (endDate) conditions.push(lte(entriesTable.date, endDate));

    const [stats] = await db
      .select({
        totalCredit: sql<number>`COALESCE(SUM(CASE WHEN type = 'credit' THEN amount::numeric ELSE 0 END), 0)`,
        totalDebit: sql<number>`COALESCE(SUM(CASE WHEN type = 'debit' THEN amount::numeric ELSE 0 END), 0)`,
        entryCount: sql<number>`COUNT(*)`,
      })
      .from(entriesTable)
      .where(and(...conditions));

    res.json({
      totalCredit: Number(stats.totalCredit),
      totalDebit: Number(stats.totalDebit),
      balance: Number(stats.totalCredit) - Number(stats.totalDebit),
      entryCount: Number(stats.entryCount),
      openingBalance: 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get ledger summary");
    res.status(500).json({ error: "Failed to get summary" });
  }
});

// GET /ledgers/:ledgerId/fifo-status
router.get("/:ledgerId/fifo-status", async (req, res) => {
  try {
    const { ledgerId } = req.params;
    const [ledger] = await db.select().from(ledgersTable).where(eq(ledgersTable.id, ledgerId));

    if (!ledger) return res.status(404).json({ error: "Ledger not found" });

    if (!ledger.fifoEnabled) {
      return res.json({ enabled: false, oldestUnpaidBill: null, bills: [], totalOutstanding: 0 });
    }

    // Get all debit entries (bills) ordered by date
    const debitEntries = await db
      .select()
      .from(entriesTable)
      .where(and(eq(entriesTable.ledgerId, ledgerId), sql`type = 'debit'`))
      .orderBy(asc(entriesTable.date), asc(entriesTable.createdAt));

    // Get all credit entries (payments) ordered by date
    const creditEntries = await db
      .select()
      .from(entriesTable)
      .where(and(eq(entriesTable.ledgerId, ledgerId), sql`type = 'credit'`))
      .orderBy(asc(entriesTable.date), asc(entriesTable.createdAt));

    // Apply FIFO: distribute payments against bills oldest-first
    let totalPayments = creditEntries.reduce((sum, e) => sum + Number(e.amount), 0);

    const bills = debitEntries.map(bill => {
      const originalAmount = Number(bill.amount);
      const paidAmount = Math.min(originalAmount, totalPayments);
      totalPayments = Math.max(0, totalPayments - originalAmount);
      const remainingAmount = originalAmount - paidAmount;

      return {
        entryId: bill.id,
        date: bill.date,
        remark: bill.remark,
        originalAmount,
        paidAmount,
        remainingAmount,
        isFullyPaid: remainingAmount === 0,
      };
    });

    const unpaidBills = bills.filter(b => !b.isFullyPaid);
    const oldestUnpaidBill = unpaidBills[0] ?? null;
    const totalOutstanding = bills.reduce((sum, b) => sum + b.remainingAmount, 0);

    res.json({ enabled: true, oldestUnpaidBill, bills, totalOutstanding });
  } catch (err) {
    req.log.error({ err }, "Failed to get FIFO status");
    res.status(500).json({ error: "Failed to get FIFO status" });
  }
});

// GET /ledgers/:ledgerId/remarks
router.get("/:ledgerId/remarks", async (req, res) => {
  try {
    const { ledgerId } = req.params;
    const rows = await db
      .selectDistinct({ remark: entriesTable.remark })
      .from(entriesTable)
      .where(eq(entriesTable.ledgerId, ledgerId))
      .orderBy(desc(entriesTable.createdAt))
      .limit(30);

    res.json(rows.map(r => r.remark));
  } catch (err) {
    req.log.error({ err }, "Failed to get remarks");
    res.status(500).json({ error: "Failed to get remarks" });
  }
});

// Helper: recalculate running balances for all entries in a ledger
async function recalculateBalances(ledgerId: string) {
  const entries = await db
    .select()
    .from(entriesTable)
    .where(eq(entriesTable.ledgerId, ledgerId))
    .orderBy(asc(entriesTable.date), asc(entriesTable.createdAt));

  let runningBalance = 0;
  for (const entry of entries) {
    const amount = Number(entry.amount);
    if (entry.type === "credit" || entry.type === "transfer") {
      runningBalance += amount;
    } else {
      runningBalance -= amount;
    }
    await db.update(entriesTable)
      .set({ balance: String(runningBalance) })
      .where(eq(entriesTable.id, entry.id));
  }
}

export default router;
