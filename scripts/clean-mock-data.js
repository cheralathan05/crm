const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbs = ['dev.db', 'frontend/dev.db'];

for (const relPath of dbs) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`[SKIP] ${relPath} not found.`);
    continue;
  }

  // Backup first
  const backupPath = `${fullPath}.bak_before_mock_cleanup`;
  fs.copyFileSync(fullPath, backupPath);
  console.log(`[BACKUP] Copied ${relPath} to ${backupPath}`);

  const db = new Database(fullPath);

  // Find mock employees
  const mockEmployees = db.prepare("SELECT id, fullName, email FROM Employee WHERE email LIKE '%@businessos.internal'").all();
  console.log(`[FOUND] ${mockEmployees.length} mock employees in ${relPath}`);

  if (mockEmployees.length === 0) {
    db.close();
    continue;
  }

  const empIds = mockEmployees.map(e => e.id);
  const placeholders = empIds.map(() => '?').join(',');

  const deleteAllocations = db.prepare(`DELETE FROM ProjectStaffAllocation WHERE employeeId IN (${placeholders})`);
  const allocRes = deleteAllocations.run(...empIds);
  console.log(`  - Deleted ${allocRes.changes} ProjectStaffAllocations`);

  const deleteInvitations = db.prepare(`DELETE FROM EmployeeInvitation WHERE recipientEmail LIKE '%@businessos.internal'`);
  const invRes = deleteInvitations.run();
  console.log(`  - Deleted ${invRes.changes} EmployeeInvitations`);

  const deleteTasks = db.prepare(`DELETE FROM ClientTask WHERE assigneeId IN (${placeholders})`);
  const taskRes = deleteTasks.run(...empIds);
  console.log(`  - Deleted ${taskRes.changes} ClientTasks assigned to mock employees`);

  const deleteAudit = db.prepare(`DELETE FROM EmployeeAuditEvent WHERE employeeId IN (${placeholders})`);
  const auditRes = deleteAudit.run(...empIds);
  console.log(`  - Deleted ${auditRes.changes} EmployeeAuditEvents`);

  const deleteEmployees = db.prepare(`DELETE FROM Employee WHERE id IN (${placeholders})`);
  const empRes = deleteEmployees.run(...empIds);
  console.log(`  - Deleted ${empRes.changes} Employee records`);

  const remaining = db.prepare("SELECT id, fullName, email FROM Employee").all();
  console.log(`[SUCCESS] Remaining genuine employees in ${relPath}: ${remaining.length}`);
  for (const r of remaining) {
    console.log(`    • ${r.fullName} (${r.email})`);
  }

  db.close();
}
