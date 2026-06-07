import { Response } from 'express';
import path from 'path';
import { prisma } from '../config/prisma';
import { parseQuestionsFile, generateSampleCsvBuffer } from '../services/csv.service';
import { AuthRequest, QuestionType } from '../types';

const VALID_TYPES: QuestionType[] = [
  'MULTIPLE_CHOICE',
  'MULTIPLE_RESPONSE',
  'TRUE_FALSE',
  'FREE_TEXT',
];

const FREE_QUESTION_LIMIT = 10;
const PAID_QUESTION_LIMIT = 100;
const FREE_RESPONSE_LIMIT = 50;
const PAID_RESPONSE_LIMIT = 2000;
const PARTICIPANT_FREE_LIMIT = 5;

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function getQuizWithOwnership(quizId: string, adminId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { category: { select: { adminId: true } } },
  });
  if (!quiz || quiz.category.adminId !== adminId) return null;
  return quiz;
}

export async function getQuestions(req: AuthRequest, res: Response): Promise<void> {
  const isAdmin = req.user?.role === 'ADMIN';

  if (!isAdmin) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.quizId },
      select: {
        published: true,
        visibility: true,
        category: { select: { adminId: true, admin: { select: { tier: true } } } },
      },
    });
    if (!quiz?.published) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    if (quiz.visibility === 'PRIVATE') {
      res.status(403).json({ error: 'This quiz is private', code: 'QUIZ_PRIVATE' });
      return;
    }

    const { adminId, admin } = quiz.category;
    if (admin.tier === 'FREE') {
      const count = await prisma.quizAttempt.count({ where: { quiz: { category: { adminId } } } });
      if (count >= FREE_RESPONSE_LIMIT) {
        res.status(403).json({
          error: 'This quiz is not currently accepting responses.',
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
          error: 'This quiz is not currently accepting responses.',
          code: 'RESPONSE_CAP_REACHED',
          tier: 'PAID',
        });
        return;
      }
    }
  }

  const quiz = await (prisma as any).quiz.findUnique({
    where: { id: req.params.quizId },
    select: { randomizeQuestions: true },
  });

  const questions = await prisma.question.findMany({
    where: { quizId: req.params.quizId },
    orderBy: { orderIndex: 'asc' },
  });

  const revealAnswers = isAdmin || req.query.study === 'true';

  const parsed = questions.map((q) => ({
    ...q,
    options: q.options ? JSON.parse(q.options) : null,
    correctAnswer: revealAnswers ? JSON.parse(q.correctAnswer) : undefined,
  }));

  // PARTICIPANT: return first 3 unless this is their complimentary quiz or they purchased this category
  // NOTE: do NOT gate this on tier — a participant who bought one category still needs
  // restriction on unpurchased categories (tier becomes PAID after first purchase).
  if (req.user?.role === 'PARTICIPANT') {
    const participant = await (prisma as any).user.findUnique({
      where: { id: req.user.id },
      select: { complimentaryQuizId: true, purchasedCategoryIds: true },
    });

    const isComplimentary = participant?.complimentaryQuizId === req.params.quizId;

    if (!isComplimentary) {
      // Look up which ExamCategory this quiz belongs to
      // URLs in DB may be stored as full URL or path — match flexibly
      const examQuiz = await (prisma as any).examQuiz.findFirst({
        where: {
          OR: [
            { url: `/quiz/${req.params.quizId}` },
            { url: { endsWith: `/quiz/${req.params.quizId}` } },
            { url: { contains: req.params.quizId } },
          ],
        },
        select: { subCategory: { select: { category: { select: { id: true, name: true } } } } },
      });
      const examCategoryId: string | null = examQuiz?.subCategory?.category?.id ?? null;
      const examCategoryName: string | null = examQuiz?.subCategory?.category?.name ?? null;

      const purchasedIds: string[] = JSON.parse(participant?.purchasedCategoryIds || '[]');
      const hasPurchasedCategory = examCategoryId ? purchasedIds.includes(examCategoryId) : false;

      if (!hasPurchasedCategory) {
        res.json({ questions: parsed.slice(0, PARTICIPANT_FREE_LIMIT), totalQuestions: parsed.length, examCategoryId, examCategoryName });
        return;
      }

      // Purchased category: enforce 10-attempt retake limit per quiz
      const attemptCount = await prisma.quizAttempt.count({
        where: { userId: req.user!.id, quizId: req.params.quizId },
      });
      if (attemptCount >= 10) {
        res.status(403).json({
          error: 'Sorry, your maximum retake attempt limit of 10 is reached',
          code: 'ATTEMPT_LIMIT_REACHED',
        });
        return;
      }
    }
  }

  // Apply shuffling for paid/complimentary participant and anonymous users
  if (!isAdmin && quiz?.randomizeQuestions) {
    for (let i = parsed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [parsed[i], parsed[j]] = [parsed[j], parsed[i]];
    }
  }

  // Participant: return as object; admin/anonymous: plain array
  if (req.user?.role === 'PARTICIPANT') {
    res.json({ questions: parsed, totalQuestions: parsed.length });
  } else {
    res.json(parsed);
  }
}

export async function createQuestion(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { quizId } = req.params;
  const { text, type, options, correctAnswer, explanation, tags } = req.body;

  if (!text || !type || !VALID_TYPES.includes(type)) {
    res.status(400).json({ error: 'text and valid type are required' });
    return;
  }

  const quiz = await getQuizWithOwnership(quizId, adminId);
  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: adminId } });
  const count = await prisma.question.count({ where: { quizId } });
  if (user?.tier === 'FREE') {
    if (count >= FREE_QUESTION_LIMIT) {
      res.status(403).json({
        error: `Free tier allows a maximum of ${FREE_QUESTION_LIMIT} questions per quiz. Upgrade to Paid to add more.`,
      });
      return;
    }
  } else {
    if (count >= PAID_QUESTION_LIMIT) {
      res.status(403).json({
        error: `Maximum of ${PAID_QUESTION_LIMIT} questions allowed per quiz.`,
      });
      return;
    }
  }

  const question = await prisma.question.create({
    data: {
      quizId,
      text,
      type,
      options: options ? JSON.stringify(options) : null,
      correctAnswer: JSON.stringify(correctAnswer),
      explanation: explanation || null,
      tags: tags ? String(tags).slice(0, 120) : null,
      orderIndex: count,
    },
  });

  res.status(201).json({
    ...question,
    options: question.options ? JSON.parse(question.options) : null,
    correctAnswer: JSON.parse(question.correctAnswer),
  });
}

export async function updateQuestion(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { id, quizId } = req.params;
  const { text, type, options, correctAnswer, explanation, tags } = req.body;

  const quiz = await getQuizWithOwnership(quizId, adminId);
  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  try {
    const question = await prisma.question.update({
      where: { id },
      data: {
        text,
        type,
        options: options !== undefined ? JSON.stringify(options) : undefined,
        correctAnswer: correctAnswer !== undefined ? JSON.stringify(correctAnswer) : undefined,
        explanation: explanation !== undefined ? (explanation || null) : undefined,
        tags: tags !== undefined ? (tags ? String(tags).slice(0, 120) : null) : undefined,
      },
    });

    res.json({
      ...question,
      options: question.options ? JSON.parse(question.options) : null,
      correctAnswer: JSON.parse(question.correctAnswer),
    });
  } catch {
    res.status(404).json({ error: 'Question not found' });
  }
}

export async function deleteQuestion(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { id, quizId } = req.params;

  const quiz = await getQuizWithOwnership(quizId, adminId);
  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  try {
    await prisma.question.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Question not found' });
  }
}

export async function bulkDeleteQuestions(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { quizId } = req.params;
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required' });
    return;
  }

  const quiz = await getQuizWithOwnership(quizId, adminId);
  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  await prisma.question.deleteMany({ where: { id: { in: ids }, quizId } });
  res.status(204).send();
}

export async function importQuestions(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { quizId } = req.params;

  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const quiz = await getQuizWithOwnership(quizId, adminId);
  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  try {
    const filePath = path.resolve(req.file.path);
    const parsed = parseQuestionsFile(filePath);

    const existing = await prisma.question.count({ where: { quizId } });

    const user = await prisma.user.findUnique({ where: { id: adminId } });
    const limit = user?.tier === 'FREE' ? FREE_QUESTION_LIMIT : PAID_QUESTION_LIMIT;
    if (existing + parsed.length > limit) {
      const tierLabel = user?.tier === 'FREE' ? 'Free tier' : 'Paid tier';
      res.status(403).json({
        error: `${tierLabel} allows a maximum of ${limit} questions per quiz. This import would exceed the limit.`,
      });
      return;
    }

    const data = parsed.map((q, i) => ({
      quizId,
      text: q.text,
      type: q.type,
      options: q.options ? JSON.stringify(q.options) : null,
      correctAnswer: JSON.stringify(q.correctAnswer),
      explanation: q.explanation || null,
      orderIndex: existing + i,
    }));

    await prisma.question.createMany({ data });

    res.json({ imported: data.length });
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message || 'Failed to parse file' });
  }
}

export function downloadSampleCsv(_req: AuthRequest, res: Response): void {
  const buffer = generateSampleCsvBuffer();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sample_questions.csv"');
  res.send(buffer);
}
