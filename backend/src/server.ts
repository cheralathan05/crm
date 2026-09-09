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
      const workspace = await db.workspace.findFirst();
      let healthInfo = null;
      if (workspace) {
        healthInfo = await evaluateControlPlaneHealth(workspace.id);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "healthy",
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          database: "connected",
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
