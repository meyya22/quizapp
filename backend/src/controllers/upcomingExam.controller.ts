import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';

// Public: get all active exams ordered by `order`
export async function getPublicExams(_req: Request, res: Response): Promise<void> {
  const exams = await prisma.upcomingExam.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    select: { id: true, examName: true, examDate: true, order: true },
  });
  res.json(exams);
}

// Super-admin: get all exams (including inactive)
export async function getAllExams(_req: AuthRequest, res: Response): Promise<void> {
  const exams = await prisma.upcomingExam.findMany({
    orderBy: { order: 'asc' },
  });
  res.json(exams);
}

// Super-admin: create
export async function createExam(req: AuthRequest, res: Response): Promise<void> {
  const { examName, examDate, order, isActive } = req.body;
  if (!examName?.trim() || !examDate?.trim()) {
    res.status(400).json({ error: 'examName and examDate are required' });
    return;
  }
  const exam = await prisma.upcomingExam.create({
    data: {
      examName: String(examName).slice(0, 100),
      examDate: String(examDate).slice(0, 100),
      order: typeof order === 'number' ? order : 0,
      isActive: isActive !== false,
    },
  });
  res.status(201).json(exam);
}

// Super-admin: update
export async function updateExam(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { examName, examDate, order, isActive } = req.body;
  try {
    const exam = await prisma.upcomingExam.update({
      where: { id },
      data: {
        ...(examName !== undefined && { examName: String(examName).slice(0, 100) }),
        ...(examDate !== undefined && { examDate: String(examDate).slice(0, 100) }),
        ...(order !== undefined && { order: Number(order) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });
    res.json(exam);
  } catch {
    res.status(404).json({ error: 'Exam not found' });
  }
}

// Super-admin: delete
export async function deleteExam(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await prisma.upcomingExam.delete({ where: { id } });
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Exam not found' });
  }
}
