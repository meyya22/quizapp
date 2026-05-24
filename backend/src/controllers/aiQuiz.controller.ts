import { Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';

const MAX_AI_QUIZZES = 5;

function buildTitle(topic: string, difficulty: string): string {
  return `${topic} — ${difficulty} Quiz`;
}

export async function generateAiQuiz(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;

  if (req.user!.role !== 'PARTICIPANT') {
    res.status(403).json({ error: 'ExamPrep is available for participants only.' }); return;
  }

  const { topic, difficulty, numQuestions, passingScore } = req.body;

  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    res.status(400).json({ error: 'Topic is required.' }); return;
  }
  if (!['Easy', 'Moderate', 'Difficult'].includes(difficulty)) {
    res.status(400).json({ error: 'Invalid difficulty. Choose Easy, Moderate, or Difficult.' }); return;
  }
  if (![5, 10, 15].includes(Number(numQuestions))) {
    res.status(400).json({ error: 'Invalid number of questions. Choose 5, 10, or 15.' }); return;
  }
  const passScore = Number(passingScore);
  if (isNaN(passScore) || passScore < 30 || passScore > 100) {
    res.status(400).json({ error: 'Passing score must be between 30 and 100.' }); return;
  }

  const existingCount = await prisma.aiQuiz.count({ where: { userId } });
  if (existingCount >= MAX_AI_QUIZZES) {
    res.status(403).json({
      error: `You have used all ${MAX_AI_QUIZZES} AI-generated quiz slots (lifetime limit). Retake your existing quizzes to keep practising.`,
      limit: MAX_AI_QUIZZES,
      used: existingCount,
    });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'AI service not configured on this server.' }); return;
  }

  const n = Number(numQuestions);
  const trimmedTopic = topic.trim().slice(0, 100);

  const systemPrompt = `You are XamGeni, an expert quiz creator. Your ONLY task is to generate quiz questions.
Output ONLY a raw JSON array — no markdown, no code fences, no text before or after.

Question types (use in this preference order):
1. MULTIPLE_CHOICE — single correct answer, 4 options labeled A/B/C/D
2. TRUE_FALSE — true or false statement
3. MULTIPLE_RESPONSE — multiple correct answers, 4 options labeled A/B/C/D
4. Fill-in-the-blank — format as MULTIPLE_CHOICE

Each question object must have exactly these fields:
- "type": "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_RESPONSE"
- "text": question string
- "options": {"A":"...","B":"...","C":"...","D":"..."} for MULTIPLE_CHOICE/MULTIPLE_RESPONSE, or null for TRUE_FALSE
- "correctAnswer": single letter "A"/"B"/"C"/"D" for MULTIPLE_CHOICE; "true" or "false" for TRUE_FALSE; array like ["A","C"] for MULTIPLE_RESPONSE
- "explanation": one or two sentence explanation of why the answer is correct`;

  const userPrompt = `Generate exactly ${n} quiz questions about "${trimmedTopic}" at ${difficulty} difficulty. Return ONLY the JSON array.`;

  let rawQuestions: unknown[];
  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const block = message.content[0];
    if (!block || block.type !== 'text') {
      res.status(502).json({ error: 'AI returned an unexpected response. Please try again.' }); return;
    }

    let jsonText = block.text.trim();
    const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonText = fence[1].trim();

    const start = jsonText.indexOf('[');
    if (start > 0) jsonText = jsonText.slice(start);
    const end = jsonText.lastIndexOf(']');
    if (end !== -1 && end < jsonText.length - 1) jsonText = jsonText.slice(0, end + 1);

    rawQuestions = JSON.parse(jsonText);
    if (!Array.isArray(rawQuestions)) throw new Error('Not an array');
  } catch (err) {
    console.error('AI quiz generation failed:', err);
    const msg = (err as { message?: string; status?: number }).message ?? '';
    const status = (err as { status?: number }).status;
    if (status === 429 || msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
      res.status(429).json({ error: 'AI rate limit reached. Please try again in a few minutes.' });
    } else {
      res.status(502).json({ error: 'AI returned an invalid response. Please try again with a clearer topic.' });
    }
    return;
  }

  const validTypes = ['MULTIPLE_CHOICE', 'MULTIPLE_RESPONSE', 'TRUE_FALSE'];
  const questions = rawQuestions
    .slice(0, n)
    .filter((q): q is Record<string, unknown> => {
      if (!q || typeof q !== 'object') return false;
      const qo = q as Record<string, unknown>;
      return (
        typeof qo.text === 'string' &&
        validTypes.includes(qo.type as string) &&
        qo.correctAnswer !== undefined && qo.correctAnswer !== null
      );
    })
    .map((q, idx) => ({
      id: `q_${idx}`,
      type: q.type as string,
      text: String(q.text).slice(0, 1000),
      options:
        (q.type === 'MULTIPLE_CHOICE' || q.type === 'MULTIPLE_RESPONSE') && q.options
          ? q.options
          : null,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation ? String(q.explanation).slice(0, 1000) : '',
    }));

  if (questions.length === 0) {
    res.status(502).json({ error: 'AI did not generate valid questions. Please try again with a different topic.' });
    return;
  }

  const aiQuiz = await prisma.aiQuiz.create({
    data: {
      userId,
      title: buildTitle(trimmedTopic, difficulty),
      topic: trimmedTopic,
      difficulty,
      numQuestions: questions.length,
      passingScore: passScore,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      questions: JSON.parse(JSON.stringify(questions)) as any,
    },
  });

  res.status(201).json({
    quiz: { ...aiQuiz, used: existingCount + 1, limit: MAX_AI_QUIZZES },
  });
}

export async function getMyAiQuizzes(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;

  const quizzes = await prisma.aiQuiz.findMany({
    where: { userId },
    include: {
      attempts: { orderBy: { completedAt: 'desc' }, take: 1 },
      _count: { select: { attempts: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ quizzes, used: quizzes.length, limit: MAX_AI_QUIZZES });
}

export async function getAiQuiz(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  const quiz = await prisma.aiQuiz.findFirst({
    where: { id, userId },
    include: { attempts: { orderBy: { completedAt: 'desc' }, take: 1 } },
  });

  if (!quiz) { res.status(404).json({ error: 'Quiz not found.' }); return; }
  res.json({ quiz });
}

export async function submitAiQuizAttempt(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;
  const { answers, timeTaken } = req.body;

  const quiz = await prisma.aiQuiz.findFirst({ where: { id, userId } });
  if (!quiz) { res.status(404).json({ error: 'Quiz not found.' }); return; }

  if (!Array.isArray(answers)) {
    res.status(400).json({ error: 'Answers must be an array.' }); return;
  }

  const questions = quiz.questions as Array<{
    id: string;
    type: string;
    correctAnswer: string | string[];
  }>;

  const answerMap = new Map<string, string | string[] | null>(
    (answers as Array<{ questionId: string; answer: string | string[] | null }>).map(
      (a) => [a.questionId, a.answer]
    )
  );

  let correct = 0;
  const gradedAnswers = questions.map((q) => {
    const submitted = answerMap.get(q.id) ?? null;
    let isCorrect = false;

    if (q.type === 'MULTIPLE_RESPONSE') {
      const correctArr = (Array.isArray(q.correctAnswer) ? [...q.correctAnswer] : [String(q.correctAnswer)]).sort();
      const submittedArr = (Array.isArray(submitted) ? [...submitted] : submitted ? [String(submitted)] : []).sort();
      isCorrect = JSON.stringify(correctArr) === JSON.stringify(submittedArr);
    } else {
      isCorrect =
        String(submitted ?? '').trim().toLowerCase() ===
        String(q.correctAnswer).trim().toLowerCase();
    }

    if (isCorrect) correct++;
    return { questionId: q.id, answer: submitted, isCorrect };
  });

  const score = questions.length > 0 ? (correct / questions.length) * 100 : 0;
  const passed = score >= quiz.passingScore;

  const attempt = await prisma.aiQuizAttempt.create({
    data: {
      aiQuizId: id,
      userId,
      score,
      passed,
      timeTaken: Number(timeTaken) || 0,
      answers: gradedAnswers,
    },
  });

  res.json({ attempt: { ...attempt, gradedAnswers } });
}
