import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const neon = new PrismaClient({
  datasources: { db: { url: process.env.NEON_URL } },
});

const sqlite = new Database(path.join(__dirname, '../prisma/dev.db'));

async function main() {
  console.log('Starting migration from SQLite → Neon...\n');

  // ── Users ────────────────────────────────────────────────────────────────
  const users = sqlite.prepare('SELECT * FROM users').all() as any[];
  console.log(`Users: ${users.length}`);
  for (const u of users) {
    await neon.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash ?? null,
        role: u.role,
        tier: u.tier,
        googleId: u.googleId ?? null,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      },
    });
  }
  console.log('  ✓ Users done');

  // ── Categories ───────────────────────────────────────────────────────────
  const categories = sqlite.prepare('SELECT * FROM categories').all() as any[];
  console.log(`Categories: ${categories.length}`);
  for (const c of categories) {
    await neon.category.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        name: c.name,
        description: c.description ?? null,
        adminId: c.adminId,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      },
    });
  }
  console.log('  ✓ Categories done');

  // ── Quizzes ──────────────────────────────────────────────────────────────
  const quizzes = sqlite.prepare('SELECT * FROM quizzes').all() as any[];
  console.log(`Quizzes: ${quizzes.length}`);
  for (const q of quizzes) {
    await neon.quiz.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id,
        title: q.title,
        description: q.description ?? null,
        categoryId: q.categoryId,
        passingScore: q.passingScore,
        published: q.published === 1 || q.published === true,
        visibility: q.visibility ?? 'PUBLIC',
        layout: q.layout ?? 'VERTICAL',
        createdAt: new Date(q.createdAt),
        updatedAt: new Date(q.updatedAt),
      },
    });
  }
  console.log('  ✓ Quizzes done');

  // ── Questions ────────────────────────────────────────────────────────────
  const questions = sqlite.prepare('SELECT * FROM questions').all() as any[];
  console.log(`Questions: ${questions.length}`);
  for (const q of questions) {
    await neon.question.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id,
        quizId: q.quizId,
        text: q.text,
        type: q.type,
        options: q.options ?? null,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation ?? null,
        orderIndex: q.orderIndex,
        createdAt: new Date(q.createdAt),
        updatedAt: new Date(q.updatedAt),
      },
    });
  }
  console.log('  ✓ Questions done');

  // ── Quiz Attempts ────────────────────────────────────────────────────────
  const attempts = sqlite.prepare('SELECT * FROM quiz_attempts').all() as any[];
  console.log(`Attempts: ${attempts.length}`);
  for (const a of attempts) {
    await neon.quizAttempt.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        userId: a.userId ?? null,
        quizId: a.quizId,
        score: a.score,
        passed: a.passed === 1 || a.passed === true,
        timeTaken: a.timeTaken,
        startedAt: new Date(a.startedAt),
        completedAt: new Date(a.completedAt),
        participantName: a.participantName ?? null,
        participantEmail: a.participantEmail ?? null,
        participantInfo: a.participantInfo ?? null,
      },
    });
  }
  console.log('  ✓ Attempts done');

  // ── Attempt Answers ──────────────────────────────────────────────────────
  const answers = sqlite.prepare('SELECT * FROM attempt_answers').all() as any[];
  console.log(`Answers: ${answers.length}`);
  for (const a of answers) {
    await neon.attemptAnswer.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        attemptId: a.attemptId,
        questionId: a.questionId,
        answer: a.answer,
        isCorrect: a.isCorrect === 1 || a.isCorrect === true,
      },
    });
  }
  console.log('  ✓ Answers done');

  console.log('\n✅ Migration complete!');
}

main()
  .catch((e) => { console.error('❌ Migration failed:', e); process.exit(1); })
  .finally(async () => {
    sqlite.close();
    await neon.$disconnect();
  });
