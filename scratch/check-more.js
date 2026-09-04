const Database = require('better-sqlite3');
const db = new Database('./dev.db', { readonly: true });

const roles = db.prepare("SELECT * FROM OrganizationRole").all();
console.log('Roles:', roles);

const staffAllocs = db.prepare("SELECT * FROM ProjectStaffAllocation").all();
console.log('Staff Allocations count:', staffAllocs.length);
console.log('Staff Allocations:', staffAllocs);

const deliverables = db.prepare("SELECT id, title, projectId FROM ProjectDeliverable").all();
console.log('Deliverables count:', deliverables.length);

const blockers = db.prepare("SELECT * FROM WorkConversation WHERE isBlocker = 1").all();
console.log('Blockers count:', blockers.length);

const notifications = db.prepare("SELECT id, employeeId, category, title, whatChanged FROM EmployeeInboxItem").all();
console.log('Notifications count:', notifications.length);
