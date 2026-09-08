import { processNextJob, getQueueMetrics } from "../frontend/src/lib/queue/job-queue.service";

/* ────────────────────────────────────────────────────────────────
   BUSINESS OS — BACKGROUND JOB WORKER DAEMON
   Runs continuously, picking up jobs from SQLite _SystemJobQueue.
──────────────────────────────────────────────────────────────── */

async function runWorker() {
  console.log("==================================================");
  console.log("BUSINESS OS BACKGROUND JOB WORKER STARTED");
  console.log("==================================================");

  let isRunning = true;

  process.on("SIGINT", () => {
    console.log("\n[Worker] Gracefully shutting down...");
    isRunning = false;
  });
  process.on("SIGTERM", () => {
    console.log("\n[Worker] Gracefully shutting down...");
    isRunning = false;
  });

  while (isRunning) {
    try {
      const outcome = await processNextJob();
      if (outcome.executed) {
        if (outcome.error) {
          console.error(`[Worker] Job ${outcome.jobId} failed: ${outcome.error}`);
        } else {
          console.log(`[Worker] Job ${outcome.jobId} completed successfully.`);
        }
        // Yield immediately to process any queued backlog
        await new Promise((resolve) => setTimeout(resolve, 50));
      } else {
        // Idle pause when no jobs are ready
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.error("[Worker] Unhandled loop error:", err);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log("[Worker] Worker exited cleanly.");
}

runWorker();
