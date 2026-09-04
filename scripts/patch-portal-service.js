const fs = require('fs');

let content = fs.readFileSync('src/lib/employees/employee-work-portal.service.ts', 'utf8');

// Find insertion point before return statement
const returnMarker = 'return {\n    employee: {';
const altReturnMarker = 'return {\r\n    employee: {';

const hasMarker = content.includes(returnMarker) || content.includes(altReturnMarker);
if (!hasMarker) {
  console.error("Could not find return statement in employee-work-portal.service.ts");
  process.exit(1);
}

const marker = content.includes(returnMarker) ? returnMarker : altReturnMarker;

const injection = `
  // Project-First Context (Section 2, 7, 18)
  const currentAlloc = employee.projectAllocations.find(
    (a) => a.projectId === currentProject?.id
  );
  const myRole = currentAlloc?.projectRole || employee.role?.name || \`\${discipline} Developer\`;
  const myTeam = (currentAlloc?.teamName || currentAlloc?.workstream || discipline || "FRONTEND").toUpperCase();

  const assignedTasks = structuredWorkItems.filter(
    (t) =>
      (t.assigneeId && (t.assigneeId === employee.id || (employee.userId && t.assigneeId === employee.userId))) ||
      (t.assigneeName && t.assigneeName.toLowerCase() === employee.fullName.toLowerCase())
  );
  const myWorkAssigned = assignedTasks.length;
  const myWorkCompleted = assignedTasks.filter((t) => t.status === "COMPLETED" || t.status === "DONE").length;
  const myWorkInProgress = assignedTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "DOING").length;
  const myWorkReview = assignedTasks.filter((t) => t.status === "IN_REVIEW" || t.status === "REVIEW").length;
  const myWorkWaiting = assignedTasks.filter((t) => {
    if (t.status === "COMPLETED" || t.status === "DONE") return false;
    return t.dependencies?.some((d: any) => d.dependsOnTask && d.dependsOnTask.status !== "COMPLETED" && d.dependsOnTask.status !== "DONE");
  }).length;

  const myWork = {
    assigned: myWorkAssigned,
    completed: myWorkCompleted,
    inProgress: myWorkInProgress,
    waiting: myWorkWaiting,
    review: myWorkReview,
  };

  const projectTeams = {
    frontend: projectRoster.frontend.length,
    backend: projectRoster.backend.length,
    database: projectRoster.database.length,
    qa: projectRoster.qa.length,
  };

  const projectSwitcher = activeProjects.map((p) => {
    const alloc = employee.projectAllocations.find((a) => a.projectId === p.id);
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      role: alloc?.projectRole || "Developer",
      team: (alloc?.teamName || alloc?.workstream || "FRONTEND").toUpperCase(),
      isActive: p.id === currentProject?.id,
    };
  });

  return {
    myProject: currentProject ? { id: currentProject.id, name: currentProject.name, code: currentProject.code } : null,
    myRole,
    myTeam,
    myWork,
    projectTeams,
    projectSwitcher,
    employee: {`;

content = content.replace(marker, injection);
fs.writeFileSync('src/lib/employees/employee-work-portal.service.ts', content, 'utf8');
console.log('employee-work-portal.service.ts updated with Section 7 project-first fields!');
