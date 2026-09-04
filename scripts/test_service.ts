import { getProjectTeamOverview } from "../src/lib/projects/project-team.service";

async function test() {
  try {
    const res = await getProjectTeamOverview("cmtmy8wjy00007cwapugky4w9");
    console.log("=== PROJECT B TEAM OVERVIEW ===");
    console.log("Project:", res.projectName, "(ID:", res.projectId, "Code:", res.projectCode, ")");
    console.log("Total Members:", res.totalMembers);
    for (const [teamName, team] of Object.entries(res.teams)) {
      console.log(`  [${teamName}] ${team.memberCount} members | Assigned: ${team.assignedTasksCount} | Completed: ${team.completedTasksCount}`);
      team.members.forEach((m: any) => {
        console.log(`    - ${m.name} (${m.role}) | Assigned: ${m.assignedCount} | Completed: ${m.completedCount} | Status: ${m.status}`);
      });
    }
  } catch (err) {
    console.error("ERROR IN getProjectTeamOverview (Project B):", err);
  }
}

test().then(() => process.exit(0));
