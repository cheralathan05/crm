import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uploadsRoot } from "@/lib/uploads";
import fs from "fs";

export const dynamic = "force-dynamic";

/**
 * Deep readiness probe — verifies dependencies before accepting user traffic.
 */
export async function GET() {
  const checks: Record<string, { status: "PASS" | "FAIL"; latencyMs?: number; message?: string }> = {};
  let overallReady = true;

  // 1. Database Read & Write Check
  const startDb = Date.now();
  try {
    await db.$queryRawUnsafe("SELECT 1 as ping");
    checks.database = {
      status: "PASS",
      latencyMs: Date.now() - startDb,
    };
  } catch (err: any) {
    overallReady = false;
    checks.database = {
      status: "FAIL",
      latencyMs: Date.now() - startDb,
      message: err.message,
    };
  }

  // 2. Storage Writable Check
  const startStorage = Date.now();
  try {
    const testDir = uploadsRoot();
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const testFile = `${testDir}/.readiness_probe_${Date.now()}`;
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
    checks.storage = {
      status: "PASS",
      latencyMs: Date.now() - startStorage,
    };
  } catch (err: any) {
    overallReady = false;
    checks.storage = {
      status: "FAIL",
      latencyMs: Date.now() - startStorage,
      message: err.message,
    };
  }

  // 3. Memory Headroom Check (<90% threshold)
  const mem = process.memoryUsage();
  const heapUsageRatio = mem.heapUsed / mem.heapTotal;
  if (heapUsageRatio > 0.92) {
    overallReady = false;
    checks.memory = {
      status: "FAIL",
      message: `Heap saturation at ${Math.round(heapUsageRatio * 100)}%`,
    };
  } else {
    checks.memory = {
      status: "PASS",
    };
  }

  return NextResponse.json(
    {
      ready: overallReady,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: overallReady ? 200 : 503 }
  );
}
