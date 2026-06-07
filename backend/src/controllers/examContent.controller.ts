import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient() as any;

// ── Public ────────────────────────────────────────────────────────────────────

export async function getPublicExamContent(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.examCategory.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        subCategories: {
          where: { isActive: true },
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
          include: {
            quizzes: {
              where: { isActive: true },
              orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Failed to load exam content.' });
  }
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getAllCategories(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.examCategory.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        subCategories: {
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
          include: { quizzes: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] } },
        },
      },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Failed to load categories.' });
  }
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const { name, order } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'name is required.' }); return; }
  try {
    const cat = await prisma.examCategory.create({ data: { name: name.trim(), order: Number(order) || 0 } });
    res.status(201).json(cat);
  } catch { res.status(500).json({ error: 'Failed to create category.' }); }
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, order, isActive } = req.body;
  try {
    const cat = await prisma.examCategory.update({
      where: { id },
      data: { ...(name !== undefined && { name: name.trim() }), ...(order !== undefined && { order: Number(order) }), ...(isActive !== undefined && { isActive }) },
    });
    res.json(cat);
  } catch { res.status(500).json({ error: 'Failed to update category.' }); }
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await prisma.examCategory.delete({ where: { id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete category.' }); }
}

// ── Sub-categories ────────────────────────────────────────────────────────────

export async function createSubCategory(req: Request, res: Response): Promise<void> {
  const { categoryId, name, order } = req.body;
  if (!categoryId || !name?.trim()) { res.status(400).json({ error: 'categoryId and name are required.' }); return; }
  try {
    const sub = await prisma.examSubCategory.create({ data: { categoryId, name: name.trim(), order: Number(order) || 0 } });
    res.status(201).json(sub);
  } catch { res.status(500).json({ error: 'Failed to create sub-category.' }); }
}

export async function updateSubCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, order, isActive } = req.body;
  try {
    const sub = await prisma.examSubCategory.update({
      where: { id },
      data: { ...(name !== undefined && { name: name.trim() }), ...(order !== undefined && { order: Number(order) }), ...(isActive !== undefined && { isActive }) },
    });
    res.json(sub);
  } catch { res.status(500).json({ error: 'Failed to update sub-category.' }); }
}

export async function deleteSubCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await prisma.examSubCategory.delete({ where: { id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete sub-category.' }); }
}

// ── Quizzes ───────────────────────────────────────────────────────────────────

export async function createExamQuiz(req: Request, res: Response): Promise<void> {
  const { subCategoryId, title, url, order } = req.body;
  if (!subCategoryId || !title?.trim()) { res.status(400).json({ error: 'subCategoryId and title are required.' }); return; }
  try {
    const quiz = await prisma.examQuiz.create({ data: { subCategoryId, title: title.trim(), url: url || null, order: Number(order) || 0 } });
    res.status(201).json(quiz);
  } catch { res.status(500).json({ error: 'Failed to create quiz.' }); }
}

export async function updateExamQuiz(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, url, order, isActive } = req.body;
  try {
    const quiz = await prisma.examQuiz.update({
      where: { id },
      data: { ...(title !== undefined && { title: title.trim() }), ...(url !== undefined && { url: url || null }), ...(order !== undefined && { order: Number(order) }), ...(isActive !== undefined && { isActive }) },
    });
    res.json(quiz);
  } catch { res.status(500).json({ error: 'Failed to update quiz.' }); }
}

export async function deleteExamQuiz(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await prisma.examQuiz.delete({ where: { id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete quiz.' }); }
}
