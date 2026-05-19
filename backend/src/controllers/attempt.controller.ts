import { Response } from 'express';
import { prisma } from '../config/prisma';
import { calculateScore } from '../services/grading.service';
import { AuthRequest, SubmittedAnswer } from '../types';

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
    include: { questions: { orderBy: { orderIndex: 'asc' } } },
  });

  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
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
    // anonymous request trying to access a logged-in user's attempt
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const result = {
    id: attempt.id,
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

export async function getAllAttempts(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { quizId, search } = req.query as { quizId?: string; search?: string };

  const attempts = await prisma.quizAttempt.findMany({
    where: {
      quiz: { category: { adminId } },
      ...(quizId && { quizId }),
      ...(search && {
        user: {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        },
      }),
    },
    orderBy: { completedAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      quiz: { select: { id: true, title: true } },
    },
  });

  res.json(attempts);
}
