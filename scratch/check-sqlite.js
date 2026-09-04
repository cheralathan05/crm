const Database = require('better-sqlite3');
const db = new Database('./dev.db', { readonly: true });

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables count:', tables.length);

const users = db.prepare("SELECT id, email, name, role FROM User").all();
console.log('Users:', users);

const employees = db.prepare("SELECT id, fullName, email, department, roleId, userId FROM Employee").all();
console.log('Employees:', employees);

const projects = db.prepare("SELECT id, name, code, stage FROM ClientProject").all();
console.log('Projects:', projects);

const tasks = db.prepare("SELECT id, code, title, layer, status, assigneeId, assigneeName FROM ClientTask").all();
console.log('Tasks count:', tasks.length);
console.log('Tasks sample:', tasks.slice(0, 5));

const conversations = db.prepare("SELECT id, title, type, projectId, taskId, workstream FROM WorkConversation").all();
console.log('Conversations count:', conversations.length);
console.log('Conversations:', conversations);

const messages = db.prepare("SELECT id, conversationId, senderName, messageType, content FROM WorkMessage").all();
console.log('Messages count:', messages.length);
console.log('Messages sample:', messages.slice(0, 5));
