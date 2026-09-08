"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Database,
  Cpu,
  Layers,
  Radio,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface TelemetryData {
  system: {
    uptimeSeconds: number;
    nodeVersion: string;
    platform: string;
    memory: { rssMB: number; heapUsedMB: number; heapTotalMB: number };
  };
  database: {
    isOpen: boolean;
    journalMode: string;
    busyTimeoutMs: number;
    synchronous: string;
    sizeMB: number;
    walSizeBytes: number;
    counts: { users: number; clients: number; projects: number; tasks: number };
  };
  queue: {
    QUEUED: number;
    RUNNING: number;
    SUCCEEDED: number;
    FAILED: number;
    RETRYING: number;
    TOTAL: number;
  };
  realtime: {
    activeConnections: number;
    activeChannels: number;
    totalDispatched: number;
  };
  cache: {
    size: number;
    hits: number;
    misses: number;
    hitRatePercent: number;
  };
  rateLimiter: {
    activeBuckets: number;
  };
}

export function ObservabilityDashboard() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  async function fetchTelemetry() {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/telemetry");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch telemetry:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchTelemetry();
    if (!autoRefresh) return;
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  async function handlePulseWorker() {
    try {
      setActionNotice("Executing background job cycle...");
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PULSE_WORKER" }),
      });
      const resData = await res.json();
      if (resData.ok && resData.result?.executed) {
        setActionNotice(`Executed Job: ${resData.result.jobId || "Done"}`);
      } else {
        setActionNotice("Queue is currently idle (no pending jobs).");
      }
      fetchTelemetry();
      setTimeout(() => setActionNotice(null), 4000);
    } catch {
      setActionNotice("Failed to pulse worker.");
    }
  }

  function formatUptime(seconds: number) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="ml-3 text-sm text-zinc-400">Loading live telemetry control plane...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-rose-400 bg-rose-950/20 border border-rose-800 rounded-xl">
        Failed to connect to internal telemetry service.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-semibold text-white tracking-tight">Business OS Observability Engine</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time health, database concurrency, durable job queues, and subsystem latency.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
              autoRefresh
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-zinc-800 border-zinc-700 text-zinc-400"
            }`}
          >
            Auto-refresh (5s): {autoRefresh ? "ON" : "PAUSED"}
          </button>

          <button
            onClick={fetchTelemetry}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-lg transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handlePulseWorker}
            className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-lg shadow-sm transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            Pulse Worker
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="px-4 py-2.5 text-xs font-medium text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-xl animate-fadeIn">
          {actionNotice}
        </div>
      )}

      {/* Grid of Key Subsystems */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Database Health */}
        <div className="p-5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-zinc-300 font-medium text-sm">
              <Database className="w-4 h-4 text-emerald-400" />
              Database Engine
            </div>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {data.database.journalMode.toUpperCase()} MODE
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Status</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ready (WAL Active)
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Database Size</span>
              <span className="text-zinc-200 font-mono">{data.database.sizeMB} MB</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Busy Lock Timeout</span>
              <span className="text-zinc-200 font-mono">{data.database.busyTimeoutMs} ms</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Total Business Records</span>
              <span className="text-zinc-200 font-mono">
                {data.database.counts.users} Users • {data.database.counts.tasks} Tasks
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Background Job Queue */}
        <div className="p-5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-zinc-300 font-medium text-sm">
              <Layers className="w-4 h-4 text-blue-400" />
              Durable Job Queue
            </div>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {data.queue.RUNNING > 0 ? "PROCESSING" : "IDLE"}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Queued / Backlog</span>
              <span className="text-zinc-200 font-mono font-medium">{data.queue.QUEUED}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Running Right Now</span>
              <span className="text-blue-400 font-mono font-medium">{data.queue.RUNNING}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Completed (Succeeded)</span>
              <span className="text-emerald-400 font-mono">{data.queue.SUCCEEDED}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Failed / Retrying</span>
              <span className={data.queue.FAILED > 0 ? "text-rose-400 font-medium" : "text-zinc-200 font-mono"}>
                {data.queue.FAILED} failed • {data.queue.RETRYING} retrying
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Real-time PubSub */}
        <div className="p-5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-zinc-300 font-medium text-sm">
              <Radio className="w-4 h-4 text-purple-400" />
              Realtime SSE Hub
            </div>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
              SSE ACTIVE
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Connected Clients</span>
              <span className="text-purple-300 font-mono font-medium">{data.realtime.activeConnections}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Active Tenant Channels</span>
              <span className="text-zinc-200 font-mono">{data.realtime.activeChannels}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Dispatched Events</span>
              <span className="text-zinc-200 font-mono">{data.realtime.totalDispatched}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Protocol</span>
              <span className="text-zinc-200">Server-Sent Events + Heartbeat</span>
            </div>
          </div>
        </div>

        {/* Card 4: Memory & Performance */}
        <div className="p-5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-zinc-300 font-medium text-sm">
              <Cpu className="w-4 h-4 text-amber-400" />
              Memory & Process
            </div>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-zinc-800 text-zinc-300">
              NODE {data.system.nodeVersion}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Heap Used</span>
              <span className="text-zinc-200 font-mono">
                {data.system.memory.heapUsedMB} MB / {data.system.memory.heapTotalMB} MB
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>RSS Memory</span>
              <span className="text-zinc-200 font-mono">{data.system.memory.rssMB} MB</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>System Uptime</span>
              <span className="text-zinc-200 font-mono">{formatUptime(data.system.uptimeSeconds)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Platform</span>
              <span className="text-zinc-200 font-mono">{data.system.platform}</span>
            </div>
          </div>
        </div>

        {/* Card 5: Cache Performance */}
        <div className="p-5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-zinc-300 font-medium text-sm">
              <Zap className="w-4 h-4 text-amber-300" />
              Tenant Namespaced Cache
            </div>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {data.cache.hitRatePercent}% HIT RATE
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Cached Keys</span>
              <span className="text-zinc-200 font-mono">{data.cache.size} entries</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Cache Hits</span>
              <span className="text-emerald-400 font-mono">{data.cache.hits}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Cache Misses</span>
              <span className="text-zinc-400 font-mono">{data.cache.misses}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Invalidation Strategy</span>
              <span className="text-zinc-200">Tenant & Namespace Scoped</span>
            </div>
          </div>
        </div>

        {/* Card 6: Edge Traffic & Rate Limiting */}
        <div className="p-5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-zinc-300 font-medium text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Edge & Rate Protection
            </div>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              PROTECTED
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Active Tracking Buckets</span>
              <span className="text-zinc-200 font-mono">{data.rateLimiter.activeBuckets}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Edge Proxy</span>
              <span className="text-emerald-400">Active (Next.js 16)</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Health Endpoints</span>
              <span className="text-zinc-200">/health • /readiness • /liveness</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Last Snapshot</span>
              <span className="text-zinc-400 font-mono">{lastRefreshed.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
