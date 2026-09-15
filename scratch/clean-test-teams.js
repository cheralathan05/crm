const Database = require('better-sqlite3');
for (const p of ['dev.db', 'frontend/dev.db']) {
  const db = new Database(p);
  db.prepare("DELETE FROM OrganizationTeam WHERE name IN ('Frontend Core Squad', 'Platform Backend Team')").run();
  db.close();
}
console.log('Cleaned test teams');
