"use client";

import { useState } from "react";
import {
  GitBranch,
  CreditCard,
  Mail,
  MessageSquare,
  Calendar,
  Cloud,
  MapPin,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type IntegrationsArchitectureViewProps = {
  blueprint: any;
  project: any;
};

export function IntegrationsArchitectureView({ blueprint, project }: IntegrationsArchitectureViewProps) {
  let integrations = (blueprint?.integrations || []) as Array<any>;

  if (integrations.length === 0) {
    // If no explicit integrations stored, extract approved integrations from proposal/scope if present
    const scopeSnap = project.scopeSnapshot ? JSON.parse(project.scopeSnapshot) : [];
    const derived: any[] = [];

    scopeSnap.forEach((s: any) => {
      const t = s.title.toLowerCase();
      if (t.includes("payment") || t.includes("checkout") || t.includes("razorpay") || t.includes("stripe")) {
        derived.push({
          id: "int-payment",
          name: "Payment Gateway",
          type: "REST",
          provider: "Razorpay / Stripe",
          direction: "BIDIRECTIONAL",
          authType: "API_KEY",
          payloadFormat: "JSON",
          syncMode: "ASYNC",
          errorStrategy: "RETRY_WITH_EXPONENTIAL_BACKOFF",
          status: "NOT_CONFIGURED",
          requirementId: s.id || "REQ-PAYMENT",
          requiredCredentials: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
          usedBy: "Checkout & Billing Service",
          apiRoute: "POST /api/v1/payments",
        });
      }
      if (t.includes("email") || t.includes("notification") || t.includes("mail")) {
        derived.push({
          id: "int-email",
          name: "Transactional Email Dispatcher",
          type: "SMTP",
          provider: "SendGrid / SMTP",
          direction: "OUTBOUND",
          authType: "API_KEY",
          payloadFormat: "JSON",
          syncMode: "ASYNC",
          errorStrategy: "RETRY_WITH_EXPONENTIAL_BACKOFF",
          status: "NOT_CONFIGURED",
          requirementId: s.id || "REQ-EMAIL",
          requiredCredentials: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER"],
          usedBy: "Notification Engine",
          apiRoute: "POST /api/v1/notifications",
        });
      }
    });

    if (derived.length > 0) {
      integrations = derived;
    }
  }

  if (integrations.length === 0) {
    return (
      <div className="p-8 text-center bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl space-y-3">
        <GitBranch className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto" />
        <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">No External Integrations Required</h3>
        <p className="text-[13px] text-[var(--bos-text-secondary)] max-w-md mx-auto">
          Not specified in approved requirements. Third-party integrations will appear when required by approved features.
        </p>
      </div>
    );
  }

  const getIntegrationIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("pay") || n.includes("stripe") || n.includes("razorpay")) return CreditCard;
    if (n.includes("mail") || n.includes("email")) return Mail;
    if (n.includes("whatsapp") || n.includes("sms") || n.includes("chat")) return MessageSquare;
    if (n.includes("calendar")) return Calendar;
    if (n.includes("storage") || n.includes("s3") || n.includes("cloud")) return Cloud;
    if (n.includes("map")) return MapPin;
    return Code2;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-[var(--bos-border-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-purple-500 font-bold">
                THIRD-PARTY INTEGRATIONS
              </span>
              <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                · {integrations.length} Approved External Gateways
              </span>
            </div>
            <h2 className="text-[18px] font-bold text-[var(--bos-text-primary)] mt-0.5">
              External Services &amp; Webhook Connectors
            </h2>
          </div>

          <div className="flex items-center gap-3 font-mono text-[12px]">
            <span className="px-3 py-1 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)]">
              Secret Safety: <strong className="text-emerald-600">Zero Raw API Keys Exposed</strong>
            </span>
          </div>
        </div>

        <p className="text-[13px] text-[var(--bos-text-secondary)] leading-relaxed">
          Only third-party integrations explicitly supported by the approved project requirements are provisioned.
        </p>
      </section>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((it: any) => {
          const Icon = getIntegrationIcon(it.name);
          const credKeys = it.requiredCredentials || (it.provider ? [`${it.provider.toUpperCase().replace(/[^A-Z]/g, "_")}_API_KEY`] : ["API_KEY"]);

          return (
            <div
              key={it.id || it.name}
              className="p-5 bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-surface-panel)]/90 border border-[var(--bos-border-subtle)] hover:border-purple-500/50 rounded-2xl transition-all space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[14.5px] font-bold text-[var(--bos-text-primary)]">
                      {it.name}
                    </h4>
                    <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                      Provider: {it.provider || "Standard Provider"}
                    </span>
                  </div>
                </div>

                <span className="font-mono text-[10.5px] uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold border border-amber-500/20">
                  {it.status || "NOT_CONFIGURED"}
                </span>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-2 text-[11.5px] font-mono pt-1">
                <div className="p-2.5 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
                  <span className="text-[var(--bos-text-tertiary)] block text-[10px]">USED BY</span>
                  <span className="text-[var(--bos-text-primary)] truncate block">
                    {it.usedBy || "Application Core"}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
                  <span className="text-[var(--bos-text-tertiary)] block text-[10px]">API CONNECTION</span>
                  <span className="text-[var(--bos-text-primary)] truncate block">
                    {it.apiRoute || "POST /api/v1/integrations"}
                  </span>
                </div>
              </div>

              {/* Required Credentials (Safe names only) */}
              <div className="pt-2 border-t border-[var(--bos-border-subtle)] space-y-1 font-mono text-[11px]">
                <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase font-semibold block">
                  Required Environment Variables:
                </span>
                <div className="flex flex-wrap gap-1">
                  {credKeys.map((k: string) => (
                    <span
                      key={k}
                      className="px-2 py-0.5 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)] text-[10.5px]"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
