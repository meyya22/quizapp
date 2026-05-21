import { Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';

const FREE_LIMIT = 3;
const PAID_LIMIT = 25;
const MAX_QUESTIONS = 10;
const FREE_QUESTION_LIMIT = 10;
const PAID_QUESTION_LIMIT = 100;

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getAiUsage(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const monthStart = getMonthStart();
  const used = user.aiGenerationsResetAt < monthStart ? 0 : user.aiGenerationsUsed;
  const limit = user.tier === 'PAID' ? PAID_LIMIT : FREE_LIMIT;

  res.json({ used, limit, tier: user.tier });
}

export async function generateQuestions(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { quizId, prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    res.status(400).json({ error: 'Prompt is required' }); return;
  }
  if (!quizId) {
    res.status(400).json({ error: 'Quiz ID is required' }); return;
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { category: { select: { adminId: true } } },
  });
  if (!quiz || quiz.category.adminId !== userId) {
    res.status(404).json({ error: 'Quiz not found' }); return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const monthStart = getMonthStart();
  const needsReset = user.aiGenerationsResetAt < monthStart;
  const currentUsed = needsReset ? 0 : user.aiGenerationsUsed;
  const limit = user.tier === 'PAID' ? PAID_LIMIT : FREE_LIMIT;

  if (currentUsed >= limit) {
    res.status(403).json({
      error: user.tier === 'FREE'
        ? `Monthly AI generation limit reached (${limit}/month on Free plan). Upgrade to Paid for 25 generations/month.`
        : `Monthly AI generation limit of ${limit} reached. Resets on the 1st of next month.`,
      used: currentUsed,
      limit,
    });
    return;
  }

  const existingCount = await prisma.question.count({ where: { quizId } });
  const questionLimit = user.tier === 'FREE' ? FREE_QUESTION_LIMIT : PAID_QUESTION_LIMIT;
  const remaining = questionLimit - existingCount;
  if (remaining <= 0) {
    res.status(403).json({
      error: `Question limit reached (${questionLimit} per quiz on ${user.tier} plan). Delete some questions first.`,
    });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'AI service not configured on this server.' }); return;
  }

  const systemInstruction = `You are a quiz question generator. Your ONLY task is to generate quiz questions. Do not explain or discuss anything — output ONLY a raw JSON array.

Each element must be an object with exactly these fields:
- "text": question string
- "type": one of MULTIPLE_CHOICE, MULTIPLE_RESPONSE, TRUE_FALSE, FREE_TEXT
- "options": object {"A":"...","B":"...","C":"...","D":"..."} for MULTIPLE_CHOICE/MULTIPLE_RESPONSE, or null for TRUE_FALSE/FREE_TEXT
- "correctAnswer": single letter "A"/"B"/"C"/"D" for MULTIPLE_CHOICE; array like ["A","C"] for MULTIPLE_RESPONSE; "true" or "false" for TRUE_FALSE; answer string for FREE_TEXT
- "explanation": string explaining why the answer is correct

Output nothing but the JSON array. No markdown, no code fences, no preamble.`;

  const userPrompt = `${prompt.trim().slice(0, 2000)}\n\nGenerate up to 10 questions. Return ONLY the JSON array.`;

  let rawQuestions: unknown[];
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction,
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    });
    const result = await model.generateContent(userPrompt);

    let text: string;
    try {
      text = result.response.text();
    } catch (safetyErr) {
      console.error('Gemini blocked response:', safetyErr);
      res.status(502).json({ error: 'AI declined this prompt. Please try a different topic or wording.' });
      return;
    }

    // Strip markdown code fences if Gemini wraps anyway
    let jsonText = text.trim();
    const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonText = fence[1].trim();
    // If response starts with [ or { it's likely raw JSON already
    const start = jsonText.indexOf('[');
    if (start > 0) jsonText = jsonText.slice(start);
    const end = jsonText.lastIndexOf(']');
    if (end !== -1 && end < jsonText.length - 1) jsonText = jsonText.slice(0, end + 1);

    rawQuestions = JSON.parse(jsonText);
    if (!Array.isArray(rawQuestions)) throw new Error('Not an array');
  } catch (err) {
    console.error('AI generation failed:', err);
    res.status(502).json({ error: 'AI returned an invalid response. Please try again with a clearer prompt.' });
    return;
  }

  const toInsert = rawQuestions.slice(0, Math.min(MAX_QUESTIONS, remaining));
  const validTypes = ['MULTIPLE_CHOICE', 'MULTIPLE_RESPONSE', 'TRUE_FALSE', 'FREE_TEXT'];
  const created = [];

  for (let i = 0; i < toInsert.length; i++) {
    const q = toInsert[i] as Record<string, unknown>;
    if (!q.text || !q.type || q.correctAnswer === undefined || q.correctAnswer === null) continue;
    if (!validTypes.includes(q.type as string)) continue;

    try {
      const question = await prisma.question.create({
        data: {
          quizId,
          text: String(q.text).slice(0, 1000),
          type: q.type as string,
          options:
            (q.type === 'MULTIPLE_CHOICE' || q.type === 'MULTIPLE_RESPONSE') && q.options
              ? JSON.stringify(q.options)
              : null,
          correctAnswer: JSON.stringify(q.correctAnswer),
          explanation: q.explanation ? String(q.explanation).slice(0, 1000) : null,
          orderIndex: existingCount + i,
        },
      });
      created.push({
        ...question,
        options: question.options ? JSON.parse(question.options) : null,
        correctAnswer: JSON.parse(question.correctAnswer),
      });
    } catch {
      // skip malformed questions
    }
  }

  const newUsed = currentUsed + 1;
  await prisma.user.update({
    where: { id: userId },
    data: {
      aiGenerationsUsed: newUsed,
      ...(needsReset ? { aiGenerationsResetAt: new Date() } : {}),
    },
  });

  res.json({ generated: created.length, questions: created, usage: { used: newUsed, limit } });
}
