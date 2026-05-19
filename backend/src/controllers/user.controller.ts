import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export async function getUsers(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tier: true,
      createdAt: true,
      _count: { select: { attempts: true } },
      categories: { select: { _count: { select: { quizzes: true } } } },
    },
  });

  const result = users.map(({ categories, ...u }) => ({
    ...u,
    quizCount: categories.reduce((sum, c) => sum + c._count.quizzes, 0),
  }));

  res.json(result);
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, role, tier } = req.body as { name?: string; role?: string; tier?: string };

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(role !== undefined && { role }),
      ...(tier !== undefined && { tier }),
    },
    select: {
      id: true, name: true, email: true, role: true, tier: true, createdAt: true,
      _count: { select: { attempts: true } },
      categories: { select: { _count: { select: { quizzes: true } } } },
    },
  });

  const { categories, ...rest } = updated;
  res.json({ ...rest, quizCount: categories.reduce((sum, c) => sum + c._count.quizzes, 0) });
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (existing.role === 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Cannot delete super admin' });
    return;
  }

  await prisma.user.delete({ where: { id } });
  res.status(204).send();
}
