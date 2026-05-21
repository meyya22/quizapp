const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');
const tables = ['users','categories','quizzes','questions','quiz_attempts','attempt_answers'];
tables.forEach(t => {
  const cols = db.prepare('PRAGMA table_info("' + t + '")').all();
  console.log('\n[' + t + ']', cols.map(c => c.name).join(', '));
  const row = db.prepare('SELECT * FROM "' + t + '" LIMIT 1').get();
  if (row) console.log('  sample:', JSON.stringify(row));
});
db.close();
