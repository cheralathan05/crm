import { db } from "@/lib/db";
import { evaluateControlPlaneHealth } from "@/lib/settings/control-plane-health.service";

async function startServer() {
  console.log("==================================================");
  console.log("BUSINESS OS BACKEND SERVICE RUNNING");
  console.log("==================================================");

  try {
    const workspace = await db.workspace.findFirst();
    if (workspace) {
      console.log(`[Database] Connected to SQLite dev.db`);
      console.log(`[Workspace] Active workspace: ${workspace.companyName} (${workspace.id})`);
      const health = await evaluateControlPlaneHealth(workspace.id);
      console.log(`[Health] Subsystems evaluated: ${health.overall} (Readiness: ${health.readiness.readinessScore}%)`);
    } else {
      console.log(`[Database] Connected. No workspace initialized yet (ready for registration).`);
    }
  } catch (err: any) {
    console.error("[Database Error]", err.message);
  }

  console.log("[Backend Core] Prisma ORM, Auth Services, and Settings Control Plane ready.");
}

startServer();
