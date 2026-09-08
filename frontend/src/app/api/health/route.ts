import { NextResponse } from "next/server";
import { getDatabaseMetrics } from "@/lib/db";
import { getQueueMetrics } from "@/lib/queue/job-queue.service";
import { realtimeHub } from "@/lib/realtime/realtime-hub";

export const dynamic = "force-dynamic";

export async function GET() {
  const uptime = process.uptime();
  const mem = process.memoryUsage();
  const dbMetrics = getDatabaseMetrics();
  const queueMetrics = getQueueMetrics();
  const realtimeMetrics = realtimeHub.getMetrics();

  return NextResponse.json({
    status: "HEALTHY",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(uptime),
    nodeVersion: process.version,
    memory: {
      rssMB: Math.round((mem.rss / (1024 * 1024)) * 100) / 100,
      heapUsedMB: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
      heapTotalMB: Math.round((mem.heapTotal / (1024 * 1024)) * 100) / 100,
    },
    database: {
      connected: dbMetrics.isOpen,
      mode: dbMetrics.journalMode,
      sizeMB: dbMetrics.sizeMB,
    },
    queue: {
      queued: queueMetrics.QUEUED,
      running: queueMetrics.RUNNING,
      failed: queueMetrics.FAILED,
    },
    realtime: {
      activeConnections: realtimeMetrics.activeConnections,
    },
  });
}
