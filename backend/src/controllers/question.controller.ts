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
      select: { published: true, visibility: true },
    });
    if (!quiz?.published) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    if (quiz.visibility === 'PRIVATE') {
      res.status(403).json({ error: 'This quiz is private', code: 'QUIZ_PRIVATE' });
      return;
    }
  }

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

  res.json(parsed);
}

export async function createQuestion(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { quizId } = req.params;
  const { text, type, options, correctAnswer, explanation } = req.body;

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
  const { text, type, options, correctAnswer, explanation } = req.body;

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
