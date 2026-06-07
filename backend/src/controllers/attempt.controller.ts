import { Response } from 'express';
import { prisma } from '../config/prisma';
import { calculateScore } from '../services/grading.service';
import { AuthRequest, SubmittedAnswer } from '../types';
import type { Request } from 'express';

function parseDevice(ua: string): string {
  if (/mobile/i.test(ua)) return 'Mobile';
  if (/tablet|ipad/i.test(ua)) return 'Tablet';
  return 'Desktop';
}

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  const ip = typeof fwd === 'string' ? fwd.split(',')[0].trim() : '';
  return ip || (req.socket?.remoteAddress ?? '');
}

async function lookupGeo(ip: string): Promise<{ city: string | null; country: string | null }> {
  if (!ip || /^(127\.|::1$|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip)) {
    return { city: null, country: null };
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,country`);
    if (!res.ok) return { city: null, country: null };
    const data = await res.json() as { status: string; city?: string; country?: string };
    if (data.status !== 'success') return { city: null, country: null };
    return { city: data.city ?? null, country: data.country ?? null };
  } catch { return { city: null, country: null }; }
}

async function lookupQuizMeta(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { title: true, category: { select: { name: true } } },
  });
  const examQuiz = await (prisma as any).examQuiz.findFirst({
    where: {
      OR: [
        { url: `/quiz/${quizId}` },
        { url: { endsWith: `/quiz/${quizId}` } },
        { url: { contains: quizId } },
      ],
    },
    select: { subCategory: { select: { name: true, category: { select: { name: true } } } } },
  });
  return {
    quizTitle: quiz?.title ?? null,
    adminCategory: quiz?.category?.name ?? null,
    examCategory: examQuiz?.subCategory?.category?.name ?? null,
    examSubCategory: examQuiz?.subCategory?.name ?? null,
  };
}

async function logAnonymousAttempt(req: Request, quizId: string, score: number, passed: boolean) {
  try {
    const meta = await lookupQuizMeta(quizId);
    const device = parseDevice(req.headers['user-agent'] ?? '');
    const { city, country } = await lookupGeo(getClientIp(req));
    await (prisma as any).anonymousAttempt.create({
      data: { eventType: 'submit', quizId, ...meta, score, passed, device, city, country },
    });
  } catch { /* non-critical */ }
}

export async function logAnonymousPreview(req: Request, res: Response): Promise<void> {
  try {
    const { quizId, quizTitle, examCategory } = req.body as Record<string, string | undefined>;
    const device = parseDevice(req.headers['user-agent'] ?? '');
    const { city, country } = await lookupGeo(getClientIp(req));
    let meta = { quizTitle: quizTitle ?? null, adminCategory: null as string | null, examCategory: examCategory ?? null, examSubCategory: null as string | null };
    if (quizId) {
      try {
        const looked = await lookupQuizMeta(quizId);
        meta = { ...looked, examCategory: examCategory ?? looked.examCategory };
      } catch { /* ok */ }
    }
    await (prisma as any).anonymousAttempt.create({
      data: { eventType: 'click', quizId: quizId ?? null, ...meta, device, city, country },
    });
  } catch { /* non-critical */ }
  res.status(201).json({ ok: true });
}

const FREE_RESPONSE_LIMIT = 50;
const PAID_RESPONSE_LIMIT = 2000;

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function submitAttempt(req: AuthRequest, res: Response): Promise<void> {
  const { quizId, answers, startedAt, participantName, participantEmail, participantInfo } = req.body as {
    quizId: string;
    answers: SubmittedAnswer[];
    startedAt: string;
    participantName?: string;
    participantEmail?: string;
    participantInfo?: string;
  };

  if (!quizId || !answers || !startedAt) {
    res.status(400).json({ error: 'quizId, answers, and startedAt are required' });
    return;
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { orderIndex: 'asc' } },
      category: { select: { adminId: true } },
    },
  });

  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  // Response quota check
  const adminId = quiz.category.adminId;
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { tier: true } });
  const tier = admin?.tier ?? 'FREE';

  if (tier === 'FREE') {
    const count = await prisma.quizAttempt.count({
      where: { quiz: { category: { adminId } } },
    });
    if (count >= FREE_RESPONSE_LIMIT) {
      res.status(403).json({
        error: 'This quiz platform has reached its lifetime response limit. The creator needs to upgrade their plan.',
        code: 'RESPONSE_CAP_REACHED',
        tier: 'FREE',
      });
      return;
    }
  } else {
    const count = await prisma.quizAttempt.count({
      where: { quiz: { category: { adminId } }, completedAt: { gte: getMonthStart() } },
    });
    if (count >= PAID_RESPONSE_LIMIT) {
      res.status(403).json({
        error: 'This quiz platform has reached its monthly response limit. Please try again next month.',
        code: 'RESPONSE_CAP_REACHED',
        tier: 'PAID',
      });
      return;
    }
  }

  const { score, gradedAnswers } = calculateScore(quiz.questions, answers);
  const passed = score >= quiz.passingScore;
  const startTime = new Date(startedAt);
  const timeTaken = Math.round((Date.now() - startTime.getTime()) / 1000);

  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  const attempt = await prisma.quizAttempt.create({
    data: {
      ...(req.user ? { userId: req.user.id } : {}),
      ...(participantName && { participantName }),
      ...(participantEmail && { participantEmail }),
      ...(participantInfo && { participantInfo }),
      quizId,
      score,
      passed,
      timeTaken,
      startedAt: startTime,
      answers: {
        create: gradedAnswers.map(({ questionId, isCorrect }) => ({
          questionId,
          answer: JSON.stringify(answerMap.get(questionId)?.answer ?? null),
          isCorrect,
        })),
      },
    },
  });

  // Log anonymous attempts for superadmin tracking
  if (!req.user) {
    logAnonymousAttempt(req, quizId, score, passed);
  }

  res.status(201).json({ id: attempt.id, score, passed, timeTaken });
}

export async function getAttempt(req: AuthRequest, res: Response): Promise<void> {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: req.params.id },
    include: {
      quiz: { select: { title: true, passingScore: true, category: { select: { adminId: true } } } },
      answers: {
        include: { question: true },
      },
    },
  });

  if (!attempt) {
    res.status(404).json({ error: 'Attempt not found' });
    return;
  }

  if (req.user) {
    const isOwner = attempt.userId === req.user.id;
    const isAdminOfQuiz =
      req.user.role === 'ADMIN' &&
      (attempt.quiz as unknown as { category?: { adminId?: string } }).category?.adminId === req.user.id;

    if (!isOwner && !isAdminOfQuiz) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
  } else if (attempt.userId !== null) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const result = {
    id: attempt.id,
    quizId: attempt.quizId,
    score: attempt.score,
    passed: attempt.passed,
    timeTaken: attempt.timeTaken,
    completedAt: attempt.completedAt,
    quiz: attempt.quiz,
    answers: attempt.answers.map((a) => ({
      questionId: a.questionId,
      questionText: a.question.text,
      questionType: a.question.type,
      options: a.question.options ? JSON.parse(a.question.options) : null,
      explanation: a.question.explanation || null,
      userAnswer: JSON.parse(a.answer),
      correctAnswer: JSON.parse(a.question.correctAnswer),
      isCorrect: a.isCorrect,
    })),
  };

  res.json(result);
}

export async function getMyAttempts(req: AuthRequest, res: Response): Promise<void> {
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: req.user!.id },
    orderBy: { completedAt: 'desc' },
    include: { quiz: { select: { title: true, category: { select: { name: true } } } } },
  });
  res.json(attempts);
}

export async function getAttemptsSummary(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;

  const attempts = await prisma.quizAttempt.findMany({
    where: { quiz: { category: { adminId } } },
    select: {
      quizId: true,
      score: true,
      passed: true,
      completedAt: true,
      quiz: { select: { title: true, category: { select: { name: true } } } },
    },
    orderBy: { completedAt: 'desc' },
  });

  const quizMap = new Map<string, { title: string; categoryName: string; count: number; totalScore: number; passCount: number; lastAt: Date }>();

  for (const a of attempts) {
    const entry = quizMap.get(a.quizId);
    if (entry) {
      entry.count++;
      entry.totalScore += a.score;
      if (a.passed) entry.passCount++;
    } else {
      quizMap.set(a.quizId, {
        title: a.quiz.title,
        categoryName: (a.quiz as any).category?.name ?? '',
        count: 1,
        totalScore: a.score,
        passCount: a.passed ? 1 : 0,
        lastAt: a.completedAt,
      });
    }
  }

  const summary = Array.from(quizMap.entries())
    .map(([quizId, d]) => ({
      quizId,
      title: d.title,
      categoryName: d.categoryName,
      attempts: d.count,
      avgScore: Math.round((d.totalScore / d.count) * 10) / 10,
      passRate: Math.round((d.passCount / d.count) * 100),
      passCount: d.passCount,
      lastAt: d.lastAt.toISOString(),
    }))
    .sort((a, b) => b.attempts - a.attempts);

  res.json(summary);
}

export async function getAllAttempts(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { quizId, search, page: pageStr, pageSize: pageSizeStr, download, sortBy, sortOrder } = req.query as {
    quizId?: string; search?: string; page?: string; pageSize?: string; download?: string;
    sortBy?: string; sortOrder?: 'asc' | 'desc';
  };

  const where = {
    quiz: { category: { adminId } },
    ...(quizId && { quizId }),
    ...(search && {
      OR: [
        { user: { name: { contains: search, mode: 'insensitive' as const } } },
        { user: { email: { contains: search, mode: 'insensitive' as const } } },
        { participantName: { contains: search, mode: 'insensitive' as const } },
        { participantEmail: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const orderBy = sortBy === 'score'
    ? { score: (sortOrder ?? 'desc') as 'asc' | 'desc' }
    : sortBy === 'date'
    ? { completedAt: (sortOrder ?? 'desc') as 'asc' | 'desc' }
    : { completedAt: 'desc' as const };

  const include = {
    user: { select: { id: true, name: true, email: true } },
    quiz: { select: { id: true, title: true, category: { select: { name: true } } } },
  };

  if (download === 'true') {
    const attempts = await prisma.quizAttempt.findMany({
      where,
      orderBy,
      include,
    });
    res.json(attempts);
    return;
  }

  const validSizes = [10, 20, 30];
  const pageSize = validSizes.includes(parseInt(pageSizeStr || '')) ? parseInt(pageSizeStr!) : 20;
  const page = Math.max(1, parseInt(pageStr || '1'));

  const [total, attempts] = await Promise.all([
    prisma.quizAttempt.count({ where }),
    prisma.quizAttempt.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include,
    }),
  ]);

  res.json({ attempts, total, page, pages: Math.ceil(total / pageSize), pageSize });
}
