import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  listJobs,
  getQueueMetrics,
  retryJob,
  cancelJob,
  processNextJob,
  JobStatus,
} from "@/lib/queue/job-queue.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required" }, { status: 401 });
  }

  // Admin/Owner verification
  if (session.user.role === "MEMBER") {
    return NextResponse.json({ ok: false, message: "Admin access required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") as JobStatus) || undefined;
  const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") ?? "50")));

  const metrics = getQueueMetrics();
  const jobs = listJobs({ status, limit });

  return NextResponse.json({
    ok: true,
    metrics,
    jobs,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required" }, { status: 401 });
  }

  if (session.user.role === "MEMBER") {
    return NextResponse.json({ ok: false, message: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, jobId } = body;

    if (action === "RETRY" && jobId) {
      const ok = retryJob(jobId);
      return NextResponse.json({ ok, message: ok ? "Job queued for retry" : "Job not found" });
    }

    if (action === "CANCEL" && jobId) {
      const ok = cancelJob(jobId);
      return NextResponse.json({ ok, message: ok ? "Job cancelled" : "Job not found or already completed" });
    }

    if (action === "PULSE_WORKER") {
      const result = await processNextJob();
      return NextResponse.json({ ok: true, result });
    }

    return NextResponse.json({ ok: false, message: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
