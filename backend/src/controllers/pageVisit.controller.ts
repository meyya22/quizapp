import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

let tableReady = false;
async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS page_visits (
      id TEXT PRIMARY KEY,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  tableReady = true;
}

export async function recordVisit(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await ensureTable();
    await prisma.$executeRaw`
      INSERT INTO page_visits (id, "createdAt")
      VALUES (gen_random_uuid()::text, NOW())
    `;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getVisitCount(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await ensureTable();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [totalRows, todayRows] = await Promise.all([
      prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM page_visits`,
      prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM page_visits WHERE "createdAt" >= ${today}`,
    ]);
    res.json({
      total: Number(totalRows[0]?.count ?? 0),
      today: Number(todayRows[0]?.count ?? 0),
    });
  } catch (err) {
    next(err);
  }
}
