const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

for (const dbPath of ['dev.db', 'frontend/dev.db']) {
  if (fs.existsSync(dbPath)) {
    const db = new Database(dbPath);
    const count = db.prepare("SELECT count(id) as count FROM Employee WHERE email LIKE '%@businessos.internal'").get().count;
    console.log(dbPath, 'mock employees:', count);
  }
}
