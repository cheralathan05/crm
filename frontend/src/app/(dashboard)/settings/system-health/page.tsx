import React from "react";
import { ObservabilityDashboard } from "@/components/monitoring/observability-dashboard";

export const metadata = {
  title: "System Health & Observability | Business OS",
  description: "Live system telemetry, database status, job queue, and real-time monitoring.",
};

export default function SystemHealthPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">System Health & Telemetry</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Monitor database concurrency, background queue backlogs, real-time connections, and operational readiness.
        </p>
      </div>

      <ObservabilityDashboard />
    </div>
  );
}
