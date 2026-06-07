import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export async function recordVisit(_req: Request, res: Response): Promise<void> {
  await (prisma as any).pageVisit.create({ data: {} });
  res.status(204).end();
}

export async function getVisitCount(_req: Request, res: Response): Promise<void> {
  const total = await (prisma as any).pageVisit.count();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await (prisma as any).pageVisit.count({ where: { createdAt: { gte: today } } });
  res.json({ total, today: todayCount });
}
