import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    alive: true,
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptimeSeconds: Math.floor(process.uptime()),
  });
}
