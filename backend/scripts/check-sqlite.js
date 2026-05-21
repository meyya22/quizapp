const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'").all();
tables.forEach(t => {
  const count = db.prepare('SELECT COUNT(*) as n FROM "' + t.name + '"').get();
  console.log(t.name + ': ' + count.n + ' rows');
});
db.close();
