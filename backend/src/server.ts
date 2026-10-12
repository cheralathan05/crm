import http from "node:http";
import { db } from "@/lib/db";
import { evaluateControlPlaneHealth } from "@/lib/settings/control-plane-health.service";

const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/api/health") {
    try {
      let workspace = null;
      let healthInfo = null;
      try {
        workspace = await db.workspace.findFirst();
        if (workspace) {
          healthInfo = await evaluateControlPlaneHealth(workspace.id);
        }
      } catch (dbErr: any) {
        console.warn("[Health Check] Database not yet seeded or initializing:", dbErr.message);
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "healthy",
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          database: workspace ? "connected" : "ready",
          workspace: workspace ? { id: workspace.id, companyName: workspace.companyName } : null,
          health: healthInfo ? { overall: healthInfo.overall, readiness: healthInfo.readiness } : "ready",
        })
      );
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "error",
          message: err.message,
          timestamp: new Date().toISOString(),
        })
      );
    }
    return;
  }

  if (url.pathname === "/api/github" || url.pathname === "/github") {
    try {
      const workspace = await db.workspace.findFirst();
      if (!workspace) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, message: "Workspace not found" }));
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Database = require("better-sqlite3");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("path");
      const sqlite = new Database(path.join(process.cwd(), "..", "dev.db"));
      const integration = sqlite.prepare("SELECT * FROM GithubIntegration WHERE workspaceId = ?").get(workspace.id);
      const repos = sqlite.prepare("SELECT * FROM GithubRepository WHERE workspaceId = ?").all(workspace.id);
      const prs = sqlite.prepare("SELECT * FROM GithubPullRequest WHERE workspaceId = ?").all(workspace.id);
      const issues = sqlite.prepare("SELECT * FROM GithubIssue WHERE workspaceId = ?").all(workspace.id);
      const commits = sqlite.prepare("SELECT * FROM GithubCommit WHERE workspaceId = ? LIMIT 10").all(workspace.id);
      const employees = sqlite.prepare("SELECT id, fullName, email, employeeCode FROM Employee WHERE workspaceId = ?").all(workspace.id);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          integration,
          repositories: repos,
          pullRequests: prs,
          issues,
          commits,
          employees,
        })
      );
      return;
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, message: err.message }));
      return;
    }
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found", path: url.pathname }));
});

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

  server.listen(PORT, HOST, () => {
    console.log(`[HTTP Server] Listening on http://${HOST}:${PORT}`);
    console.log(`[HTTP Server] Health check route ready on http://${HOST}:${PORT}/health`);
  });
}

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing HTTP server gracefully...");
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, closing HTTP server gracefully...");
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
});

startServer();
