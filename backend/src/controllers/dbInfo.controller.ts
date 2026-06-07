import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';

const TABLES = [
  { name: 'users',               label: 'Users' },
  { name: 'categories',          label: 'Categories' },
  { name: 'quizzes',             label: 'Quizzes' },
  { name: 'questions',           label: 'Questions' },
  { name: 'quiz_attempts',       label: 'Quiz Attempts' },
  { name: 'attempt_answers',     label: 'Attempt Answers' },
  { name: 'category_purchases',  label: 'Category Purchases' },
  { name: 'pending_purchases',   label: 'Pending Purchases' },
  { name: 'contacts',            label: 'Contacts' },
  { name: 'email_history',       label: 'Email History' },
  { name: 'campaign_history',    label: 'Campaign History' },
  { name: 'campaign_recipients', label: 'Campaign Recipients' },
  { name: 'marketing_contacts',  label: 'Marketing Contacts' },
  { name: 'ai_quizzes',          label: 'AI Quizzes' },
  { name: 'ai_quiz_attempts',    label: 'AI Quiz Attempts' },
  { name: 'exam_categories',     label: 'Exam Categories' },
  { name: 'exam_sub_categories', label: 'Exam Sub-Categories' },
  { name: 'exam_quizzes',        label: 'Exam Quizzes' },
  { name: 'upcoming_exams',      label: 'Upcoming Exams' },
  { name: 'preview_sessions',    label: 'Preview Sessions' },
  { name: 'anonymous_attempts',  label: 'Anonymous Attempts' },
];

export async function getDbInfo(_req: AuthRequest, res: Response): Promise<void> {
  const rows = await Promise.all(
    TABLES.map(async ({ name, label }) => {
      try {
        const result = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
          `SELECT COUNT(*) AS count FROM "${name}"`
        );
        return { table: name, label, count: Number(result[0].count) };
      } catch {
        return { table: name, label, count: -1 };
      }
    })
  );

  const total = rows.reduce((s, r) => s + (r.count > 0 ? r.count : 0), 0);
  res.json({ tables: rows, totalRows: total, checkedAt: new Date().toISOString() });
}
