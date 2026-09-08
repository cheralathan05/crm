import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDatabaseMetrics, db } from "@/lib/db";
import { getQueueMetrics } from "@/lib/queue/job-queue.service";
import { realtimeHub } from "@/lib/realtime/realtime-hub";
import { cache } from "@/lib/cache";
import { getRateLimiterMetrics } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required" }, { status: 401 });
  }

  if (session.user.role === "MEMBER") {
    return NextResponse.json({ ok: false, message: "Admin access required" }, { status: 403 });
  }

  const [usersCount, clientsCount, projectsCount, tasksCount] = await Promise.all([
    db.user.count().catch(() => 0),
    db.client.count().catch(() => 0),
    db.clientProject.count().catch(() => 0),
    db.clientTask.count().catch(() => 0),
  ]);

  const dbMetrics = getDatabaseMetrics();
  const queueMetrics = getQueueMetrics();
  const realtimeMetrics = realtimeHub.getMetrics();
  const cacheMetrics = cache.getMetrics();
  const rateLimitMetrics = getRateLimiterMetrics();
  const mem = process.memoryUsage();

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    system: {
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rssMB: Math.round((mem.rss / (1024 * 1024)) * 100) / 100,
        heapUsedMB: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
        heapTotalMB: Math.round((mem.heapTotal / (1024 * 1024)) * 100) / 100,
      },
    },
    database: {
      ...dbMetrics,
      counts: {
        users: usersCount,
        clients: clientsCount,
        projects: projectsCount,
        tasks: tasksCount,
      },
    },
    queue: queueMetrics,
    realtime: realtimeMetrics,
    cache: cacheMetrics,
    rateLimiter: rateLimitMetrics,
  });
}
