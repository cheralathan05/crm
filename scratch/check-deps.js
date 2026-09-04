const Database = require('better-sqlite3');
const db = new Database('./dev.db', { readonly: true });

const taskCols = db.prepare("PRAGMA table_info(ClientTask)").all();
console.log('ClientTask columns:', taskCols.map(c => c.name));

const depCols = db.prepare("PRAGMA table_info(TaskDependency)").all();
console.log('TaskDependency columns:', depCols.map(c => c.name));

const deps = db.prepare("SELECT * FROM TaskDependency").all();
console.log('TaskDependency count:', deps.length);
console.log('TaskDependency sample:', deps.slice(0, 5));

const deliverables = db.prepare("PRAGMA table_info(ProjectDeliverable)").all();
console.log('ProjectDeliverable columns:', deliverables.map(c => c.name));
