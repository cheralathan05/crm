"use client";

import { useState } from "react";
import {
  Shield,
  Lock,
  UserCheck,
  Key,
  CheckCircle2,
  FileCheck2,
  AlertTriangle,
  Layers,
  Globe,
  Code2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AuthSecurityViewProps = {
  blueprint: any;
  project: any;
};

export function AuthSecurityView({ blueprint, project }: AuthSecurityViewProps) {
  const securityReqs = (blueprint?.securityRequirements || []) as Array<any>;
  const apis = (blueprint?.backendApis || []) as Array<any>;
  const frontendCaps = (blueprint?.frontendCapabilities || []) as Array<any>;

  // Extract roles and permissions
  const roles = [
    {
      name: "ADMIN",
      title: "Workspace Administrator",
      description: "Full configuration and management capability across all project operational vectors.",
      permissions: ["project:read", "project:write", "team:manage", "billing:admin", "blueprint:approve"],
    },
    {
      name: "EMPLOYEE / SPECIALIST",
      title: "Execution Specialist",
      description: "Access to task assignments, evidence submission, and engineering execution workflows.",
      permissions: ["task:execute", "deliverable:submit", "evidence:attach", "comment:write"],
    },
    {
      name: "CLIENT STAKEHOLDER",
      title: "Client Approver",
      description: "Read-only access to progress with capability to approve deliverables and submit change requests.",
      permissions: ["deliverable:review", "deliverable:signoff", "changerequest:create", "summary:view"],
    },
  ];

  // Protected Pages and APIs
  const protectedPages = frontendCaps.filter((f) => {
    try {
      if (f.permissionRequirements) {
        const perms = JSON.parse(f.permissionRequirements);
        return perms.length > 0;
      }
    } catch {}
    return true;
  });

  const protectedApis = apis.filter((a) => a.authentication === true);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-[var(--bos-border-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-rose-500 font-bold">
                AUTHENTICATION &amp; ACCESS CONTROL
              </span>
              <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                · Zero-Trust Security Specification
              </span>
            </div>
            <h2 className="text-[18px] font-bold text-[var(--bos-text-primary)] mt-0.5">
              Identity, RBAC Roles &amp; Security Guards
            </h2>
          </div>

          <div className="flex items-center gap-3 font-mono text-[12px]">
            <span className="px-3 py-1 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)]">
              Auth Mechanism: <strong className="text-[var(--bos-text-primary)]">Session Token &amp; Signed JWT</strong>
            </span>
          </div>
        </div>

        {/* Security Summary Tokens */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px] font-mono">
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">AUTHENTICATION</span>
            <strong className="text-[14px] text-emerald-600">✓ Enforced</strong>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">RBAC ROLES</span>
            <strong className="text-[14px] text-[var(--bos-text-primary)]">{roles.length} Defined</strong>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">PROTECTED APIS</span>
            <strong className="text-[14px] text-indigo-600">{protectedApis.length} Endpoints</strong>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">PROTECTED PAGES</span>
            <strong className="text-[14px] text-purple-600">{protectedPages.length} Pages</strong>
          </div>
        </div>
      </section>

      {/* RBAC Roles Matrix */}
      <section className="space-y-4">
        <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
          Defined Organization Roles &amp; Permissions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div
              key={role.name}
              className="p-5 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20">
                  {role.name}
                </span>
                <Users className="w-4 h-4 text-[var(--bos-text-tertiary)]" />
              </div>

              <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)]">{role.title}</h4>
              <p className="text-[12px] text-[var(--bos-text-secondary)] leading-relaxed">
                {role.description}
              </p>

              <div className="pt-2 border-t border-[var(--bos-border-subtle)] space-y-1.5 font-mono text-[11px]">
                <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase font-semibold block">
                  Granted Capabilities:
                </span>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Protected Routes & APIs Explorer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Protected Pages */}
        <section className="p-5 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--bos-border-subtle)]">
            <h4 className="text-[13.5px] font-bold text-[var(--bos-text-primary)] flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-purple-500" />
              <span>Protected Frontend Screens ({protectedPages.length})</span>
            </h4>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {protectedPages.map((fe) => (
              <div
                key={fe.id}
                className="p-2.5 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] flex items-center justify-between text-[11.5px] font-mono"
              >
                <span className="text-[var(--bos-text-primary)] truncate">{fe.name}</span>
                <span className="text-purple-600 font-semibold">{fe.route || "/"}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Protected APIs */}
        <section className="p-5 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--bos-border-subtle)]">
            <h4 className="text-[13.5px] font-bold text-[var(--bos-text-primary)] flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-500" />
              <span>Protected API Endpoints ({protectedApis.length})</span>
            </h4>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {protectedApis.map((api) => (
              <div
                key={api.id}
                className="p-2.5 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] flex items-center justify-between text-[11.5px] font-mono"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-emerald-600 font-bold">{api.method}</span>
                  <span className="text-[var(--bos-text-primary)] truncate">{api.path}</span>
                </div>
                <span className="text-indigo-600 font-semibold shrink-0">{api.authorization || "AUTH"}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
