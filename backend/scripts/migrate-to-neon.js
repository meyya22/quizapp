// Migration script: SQLite → Neon PostgreSQL
// Clears Neon tables first, then re-imports everything from SQLite
const Database = require('better-sqlite3');
const { Client } = require('pg');
const path = require('path');

const NEON_URL = 'postgresql://neondb_owner:npg_fhMZL4YB2HTV@ep-green-forest-aq3hllek.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sqlite = new Database(path.join(__dirname, '../prisma/dev.db'));
const pg = new Client({ connectionString: NEON_URL });

function toDate(ms) {
  if (!ms) return new Date().toISOString();
  return new Date(typeof ms === 'number' ? ms : parseInt(ms)).toISOString();
}
function toBool(val) { return val === 1 || val === true || val === '1'; }
function ns(val) { return val || null; }

async function run(sql, params) { return pg.query(sql, params || []); }

async function main() {
  await pg.connect();
  console.log('Connected to Neon.\n');

  // ── Show what's already in Neon ────────────────────────────────────────
  const existing = await run('SELECT COUNT(*) FROM users');
  console.log(`Existing Neon users: ${existing.rows[0].count}`);

  // ── Truncate in reverse FK order ───────────────────────────────────────
  console.log('Clearing Neon tables...');
  await run('TRUNCATE attempt_answers CASCADE');
  await run('TRUNCATE quiz_attempts CASCADE');
  await run('TRUNCATE questions CASCADE');
  await run('TRUNCATE quizzes CASCADE');
  await run('TRUNCATE categories CASCADE');
  await run('TRUNCATE users CASCADE');
  console.log('  ✓ All tables cleared\n');

  // ── 1. Users ──────────────────────────────────────────────────────────
  const users = sqlite.prepare('SELECT * FROM users').all();
  console.log(`Migrating ${users.length} users...`);
  for (const u of users) {
    await run(`
      INSERT INTO users (id, name, email, "passwordHash", role, tier, "googleId",
        "stripeCustomerId", "stripeSubscriptionId", "subscriptionStatus",
        "subscriptionPlan", "subscriptionCurrentPeriodEnd", "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `, [
      u.id, u.name, u.email, ns(u.passwordHash), u.role, u.tier,
      ns(u.googleId), ns(u.stripeCustomerId), ns(u.stripeSubscriptionId),
      ns(u.subscriptionStatus), ns(u.subscriptionPlan),
      u.subscriptionCurrentPeriodEnd ? toDate(u.subscriptionCurrentPeriodEnd) : null,
      toDate(u.createdAt), toDate(u.updatedAt)
    ]);
  }
  console.log('  ✓ Users done');

  // ── 2. Categories ─────────────────────────────────────────────────────
  const categories = sqlite.prepare('SELECT * FROM categories').all();
  console.log(`Migrating ${categories.length} categories...`);
  for (const c of categories) {
    await run(`
      INSERT INTO categories (id, "adminId", name, description, "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [c.id, c.adminId, c.name, ns(c.description), toDate(c.createdAt), toDate(c.updatedAt)]);
  }
  console.log('  ✓ Categories done');

  // ── 3. Quizzes ────────────────────────────────────────────────────────
  const quizzes = sqlite.prepare('SELECT * FROM quizzes').all();
  console.log(`Migrating ${quizzes.length} quizzes...`);
  for (const q of quizzes) {
    await run(`
      INSERT INTO quizzes (id, "categoryId", title, description, "passingScore",
        published, visibility, layout, "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [
      q.id, q.categoryId, q.title, ns(q.description), q.passingScore,
      toBool(q.published), q.visibility || 'PUBLIC', q.layout || 'VERTICAL',
      toDate(q.createdAt), toDate(q.updatedAt)
    ]);
  }
  console.log('  ✓ Quizzes done');

  // ── 4. Questions ──────────────────────────────────────────────────────
  const questions = sqlite.prepare('SELECT * FROM questions').all();
  console.log(`Migrating ${questions.length} questions...`);
  for (const q of questions) {
    await run(`
      INSERT INTO questions (id, "quizId", text, type, options, "correctAnswer",
        explanation, "orderIndex")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [q.id, q.quizId, q.text, q.type, ns(q.options), q.correctAnswer, ns(q.explanation), q.orderIndex]);
  }
  console.log('  ✓ Questions done');

  // ── 5. Quiz Attempts ──────────────────────────────────────────────────
  const attempts = sqlite.prepare('SELECT * FROM quiz_attempts').all();
  console.log(`Migrating ${attempts.length} attempts...`);
  for (const a of attempts) {
    await run(`
      INSERT INTO quiz_attempts (id, "userId", "quizId", score, passed, "timeTaken",
        "startedAt", "completedAt", "participantName", "participantEmail", "participantInfo")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [
      a.id, ns(a.userId), a.quizId, a.score, toBool(a.passed), a.timeTaken,
      toDate(a.startedAt), toDate(a.completedAt),
      ns(a.participantName), ns(a.participantEmail), ns(a.participantInfo)
    ]);
  }
  console.log('  ✓ Attempts done');

  // ── 6. Attempt Answers ────────────────────────────────────────────────
  const answers = sqlite.prepare('SELECT * FROM attempt_answers').all();
  console.log(`Migrating ${answers.length} answers...`);
  for (const a of answers) {
    await run(`
      INSERT INTO attempt_answers (id, "attemptId", "questionId", answer, "isCorrect")
      VALUES ($1,$2,$3,$4,$5)
    `, [a.id, a.attemptId, a.questionId, a.answer, toBool(a.isCorrect)]);
  }
  console.log('  ✓ Answers done');

  console.log(`\n✅ Migration complete!`);
  console.log(`   ${users.length} users | ${categories.length} categories | ${quizzes.length} quizzes | ${questions.length} questions | ${attempts.length} attempts | ${answers.length} answers`);
  console.log('\nNOTE: Superadmin account was cleared. Re-add it via Neon SQL Editor if needed.');
}

main()
  .catch(e => { console.error('\n❌ Error:', e.message); process.exit(1); })
  .finally(async () => { sqlite.close(); await pg.end(); });
