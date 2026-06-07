import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';

const FREE_QUIZ_TOTAL = 5;
const PAID_QUIZ_TOTAL = 200;

export async function getQuizzes(req: AuthRequest, res: Response): Promise<void> {
  const isAdmin = req.user?.role === 'ADMIN';

  const quizzes = await prisma.quiz.findMany({
    where: isAdmin
      ? { category: { adminId: req.user!.id } }
      : { published: true, visibility: 'PUBLIC' },
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { id: true, name: true, admin: { select: { name: true } } } },
      _count: { select: { questions: true, attempts: true } },
    },
  });
  res.json(quizzes);
}

export async function getQuiz(req: AuthRequest, res: Response): Promise<void> {
  const isAdmin = req.user?.role === 'ADMIN';

  const quiz = await prisma.quiz.findUnique({
    where: { id: req.params.id },
    include: {
      category: { select: { id: true, name: true, adminId: true } },
      _count: { select: { questions: true } },
    },
  });

  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  if (isAdmin) {
    if (quiz.category.adminId !== req.user!.id) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
  } else {
    if (!quiz.published) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    if (quiz.visibility === 'PRIVATE') {
      res.status(403).json({ error: 'This quiz is private', code: 'QUIZ_PRIVATE' });
      return;
    }
  }

  res.json(quiz);
}

export async function toggleVisibility(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { id } = req.params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: { category: { select: { adminId: true } } },
  });
  if (!quiz || quiz.category.adminId !== adminId) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  const updated = await prisma.quiz.update({
    where: { id },
    data: { visibility: quiz.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC' },
    include: { category: { select: { id: true, name: true } } },
  });
  res.json(updated);
}

export async function createQuiz(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { categoryId, title, description, passingScore, visibility, layout, defaultLanguage, randomizeQuestions } = req.body;
  if (!categoryId || !title) {
    res.status(400).json({ error: 'categoryId and title are required' });
    return;
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.adminId !== adminId) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: adminId } });
  if (user?.tier === 'FREE') {
    const totalCount = await prisma.quiz.count({ where: { category: { adminId } } });
    if (totalCount >= FREE_QUIZ_TOTAL) {
      res.status(403).json({
        error: `Free tier allows ${FREE_QUIZ_TOTAL} quizzes total. Upgrade to Paid to create more.`,
      });
      return;
    }
  } else {
    const totalCount = await prisma.quiz.count({ where: { category: { adminId } } });
    if (totalCount >= PAID_QUIZ_TOTAL) {
      res.status(403).json({
        error: `Paid tier allows a maximum of ${PAID_QUIZ_TOTAL} quizzes in total.`,
      });
      return;
    }
  }

  const quiz = await prisma.quiz.create({
    data: {
      categoryId, title, description, passingScore: passingScore ?? 70,
      visibility: visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
      layout: layout === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL',
      ...(defaultLanguage && { defaultLanguage }),
      randomizeQuestions: randomizeQuestions === true,
    },
    include: { category: { select: { id: true, name: true } } },
  });
  res.status(201).json(quiz);
}

export async function updateQuiz(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { id } = req.params;
  const { categoryId, title, description, passingScore, visibility, layout, defaultLanguage, randomizeQuestions } = req.body;

  const existing = await prisma.quiz.findUnique({
    where: { id },
    include: { category: { select: { adminId: true } } },
  });
  if (!existing || existing.category.adminId !== adminId) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  const quiz = await prisma.quiz.update({
    where: { id },
    data: {
      categoryId, title, description, passingScore,
      ...(visibility !== undefined && { visibility: visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC' }),
      ...(layout !== undefined && { layout: layout === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL' }),
      ...(defaultLanguage !== undefined && { defaultLanguage }),
      ...(randomizeQuestions !== undefined && { randomizeQuestions: randomizeQuestions === true }),
    },
    include: { category: { select: { id: true, name: true } } },
  });
  res.json(quiz);
}

export async function togglePublish(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { id } = req.params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: { category: { select: { adminId: true } } },
  });
  if (!quiz || quiz.category.adminId !== adminId) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  const updated = await prisma.quiz.update({
    where: { id },
    data: { published: !quiz.published },
    include: { category: { select: { id: true, name: true } } },
  });
  res.json(updated);
}

export async function deleteQuiz(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { id } = req.params;

  const existing = await prisma.quiz.findUnique({
    where: { id },
    include: { category: { select: { adminId: true } } },
  });
  if (!existing || existing.category.adminId !== adminId) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  await prisma.$transaction([
    prisma.attemptAnswer.deleteMany({ where: { attempt: { quizId: id } } }),
    prisma.quizAttempt.deleteMany({ where: { quizId: id } }),
    prisma.question.deleteMany({ where: { quizId: id } }),
    prisma.quiz.delete({ where: { id } }),
  ]);
  res.status(204).send();
}

export async function getAdminStats(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;

  const [categories, quizzes, attempts, uniqueParticipants] = await Promise.all([
    prisma.category.count({ where: { adminId } }),
    prisma.quiz.count({ where: { category: { adminId } } }),
    prisma.quizAttempt.count({ where: { quiz: { category: { adminId } } } }),
    prisma.quizAttempt.groupBy({
      by: ['userId'],
      where: { quiz: { category: { adminId } } },
    }),
  ]);

  res.json({ categories, quizzes, participants: uniqueParticipants.length, attempts });
}
