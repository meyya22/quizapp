import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';

const FREE_CATEGORY_LIMIT = 5;

export async function getCategories(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const categories = await prisma.category.findMany({
    where: { adminId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { quizzes: true } } },
  });
  res.json(categories);
}

export async function createCategory(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { name, description } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: adminId } });
  if (user?.tier === 'FREE') {
    const count = await prisma.category.count({ where: { adminId } });
    if (count >= FREE_CATEGORY_LIMIT) {
      res.status(403).json({
        error: `Free tier allows a maximum of ${FREE_CATEGORY_LIMIT} categories. Upgrade to Paid to create more.`,
      });
      return;
    }
  }

  try {
    const category = await prisma.category.create({ data: { adminId, name, description } });
    res.status(201).json(category);
  } catch {
    res.status(409).json({ error: 'A category with that name already exists' });
  }
}

export async function updateCategory(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { id } = req.params;
  const { name, description } = req.body;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing || existing.adminId !== adminId) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  try {
    const category = await prisma.category.update({
      where: { id },
      data: { name, description },
    });
    res.json(category);
  } catch {
    res.status(409).json({ error: 'A category with that name already exists' });
  }
}

export async function deleteCategory(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { id } = req.params;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing || existing.adminId !== adminId) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  await prisma.category.delete({ where: { id } });
  res.status(204).send();
}
