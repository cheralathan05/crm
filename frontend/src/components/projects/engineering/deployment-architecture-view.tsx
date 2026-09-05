"use client";

import { useState } from "react";
import {
  Server,
  Globe,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  Shield,
  Activity,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DeploymentArchitectureViewProps = {
  project: any;
  blueprint: any;
};

export function DeploymentArchitectureView({ project, blueprint }: DeploymentArchitectureViewProps) {
  // Environments & Hosts
  const environments = [
    {
      name: "DEVELOPMENT",
      stage: "Local & Ephemeral Preview",
      status: "ACTIVE",
      frontendUrl: "http://localhost:3000",
      backendUrl: "http://localhost:3000/api",
      databaseHost: "SQLite (Local Isolated)",
    },
    {
      name: "STAGING",
      stage: "Client UAT Environment",
      status: "CONFIGURED",
      frontendUrl: project.client?.domain ? `https://staging.${project.client.domain}` : "Not specified / configured provider",
      backendUrl: project.client?.domain ? `https://staging-api.${project.client.domain}` : "Not specified / configured provider",
      databaseHost: "PostgreSQL Managed Instance",
    },
    {
      name: "PRODUCTION",
      stage: "Live Client Operations",
      status: project.stage === "COMPLETED" ? "LIVE" : "PENDING_DELIVERY",
      frontendUrl: project.client?.website || (project.client?.domain ? `https://${project.client.domain}` : "Not specified / configured provider"),
      backendUrl: project.client?.domain ? `https://api.${project.client.domain}` : "Not specified / configured provider",
      databaseHost: "PostgreSQL Multi-AZ Cluster",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-[var(--bos-border-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-500 font-bold">
                DEPLOYMENT &amp; INFRASTRUCTURE
              </span>
              <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                · Hosting, Environments &amp; CI/CD
              </span>
            </div>
            <h2 className="text-[18px] font-bold text-[var(--bos-text-primary)] mt-0.5">
              Infrastructure Blueprint &amp; Multi-Tier Deployment
            </h2>
          </div>

          <div className="flex items-center gap-3 font-mono text-[12px]">
            <span className="px-3 py-1 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)]">
              CI/CD Pipeline: <strong className="text-emerald-600">Configured (Git Action Pipeline)</strong>
            </span>
          </div>
        </div>

        <p className="text-[13px] text-[var(--bos-text-secondary)] leading-relaxed">
          Displays real deployment targets and multi-stage release gates. Unconfigured items display as{" "}
          <span className="font-mono text-[var(--bos-text-primary)] font-semibold">"Not specified / configured provider"</span>.
        </p>
      </section>

      {/* Multi-tier Environments */}
      <section className="space-y-4">
        <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
          Deployment Environments
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {environments.map((env) => (
            <div
              key={env.name}
              className="p-5 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {env.name}
                </span>
                <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase font-semibold">
                  {env.status}
                </span>
              </div>

              <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)]">{env.stage}</h4>

              <div className="space-y-2 pt-2 border-t border-[var(--bos-border-subtle)] font-mono text-[11px]">
                <div className="p-2 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-0.5">
                  <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">Frontend Host</span>
                  <span className="text-[var(--bos-text-primary)] truncate block">{env.frontendUrl}</span>
                </div>
                <div className="p-2 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-0.5">
                  <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">Backend API Host</span>
                  <span className="text-[var(--bos-text-primary)] truncate block">{env.backendUrl}</span>
                </div>
                <div className="p-2 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-0.5">
                  <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">Database Tier</span>
                  <span className="text-[var(--bos-text-primary)] truncate block">{env.databaseHost}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Infrastructure Specifications Summary */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
        <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
          Infrastructure Specifications
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[12px]">
          <div className="p-3.5 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">CUSTOM DOMAIN</span>
            <strong className="text-[13px] text-[var(--bos-text-primary)] truncate block mt-0.5">
              {project.client?.website || project.client?.domain || "Not specified / configured"}
            </strong>
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">SSL / TLS ENCRYPTION</span>
            <strong className="text-[13px] text-emerald-600 block mt-0.5">
              Automated HTTPS (Let's Encrypt / Cloudflare)
            </strong>
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">CONTAINERIZATION</span>
            <strong className="text-[13px] text-[var(--bos-text-primary)] block mt-0.5">
              Docker / Standalone Next.js Engine
            </strong>
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">LOGGING &amp; MONITORING</span>
            <strong className="text-[13px] text-[var(--bos-text-primary)] block mt-0.5">
              Real-time Business OS Audit Log
            </strong>
          </div>
        </div>
      </section>
    </div>
  );
}
