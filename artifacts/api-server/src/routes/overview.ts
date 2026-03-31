import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ledgersTable, entriesTable } from "@workspace/db/schema";
import { eq, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/overview", async (req, res): Promise<void> => {
  try {
    const ledgers = await db.select().from(ledgersTable);

    let totalOutstanding = 0;
    let ledgersOwingMe = 0;
    let ledgersIOweThem = 0;

    for (const ledger of ledgers) {
      const [stats] = await db
        .select({
          totalCredit: sql<number>`COALESCE(SUM(CASE WHEN type = 'credit' THEN amount::numeric ELSE 0 END), 0)`,
          totalDebit: sql<number>`COALESCE(SUM(CASE WHEN type = 'debit' THEN amount::numeric ELSE 0 END), 0)`,
        })
        .from(entriesTable)
        .where(eq(entriesTable.ledgerId, ledger.id));

      const balance = Number(stats.totalCredit) - Number(stats.totalDebit);
      if (balance > 0) ledgersOwingMe++;
      else if (balance < 0) ledgersIOweThem++;
      totalOutstanding += balance;
    }

    const recentEntries = await db
      .select({
        ledgerId: entriesTable.ledgerId,
        entryId: entriesTable.id,
        date: entriesTable.date,
        remark: entriesTable.remark,
        amount: entriesTable.amount,
        type: entriesTable.type,
        ledgerName: sql<string>`(SELECT name FROM ledgers WHERE id = entries.ledger_id)`,
      })
      .from(entriesTable)
      .orderBy(desc(entriesTable.createdAt))
      .limit(10);

    res.json({
      totalLedgers: ledgers.length,
      totalOutstanding,
      ledgersOwingMe,
      ledgersIOweThem,
      recentActivity: recentEntries.map(e => ({
        ...e,
        amount: Number(e.amount),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get overview");
    res.status(500).json({ error: "Failed to get overview" });
  }
});

export default router;
