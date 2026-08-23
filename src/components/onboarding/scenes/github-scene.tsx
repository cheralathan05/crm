"use client";

import { MiniApp, Chip, useSequence, Reveal } from "../kit";
import { SceneLayout } from "../scene-layout";

const CHAIN = [
  { label: "Issue #42", meta: "Payment API" },
  { label: "feature/payment-api", meta: "branch" },
  { label: "3 commits", meta: "linked" },
  { label: "Pull Request #18", meta: "ready" },
  { label: "Code review", meta: "2 approvals" },
  { label: "Merged", meta: "main" },
];

export function GitHubScene() {
  // 0 task, 1-6 chain, 7 merged
  const step = useSequence(CHAIN.length + 2, 700);
  const merged = step >= CHAIN.length + 1;
  const chainShown = Math.min(step - 1, CHAIN.length);

  return (
    <SceneLayout
      code="08"
      label="GITHUB"
      title="Development"
      description="Business execution connects with the code that delivers it — every task links to an issue, a branch, and a pull request."
      capabilities={[
        "Task ↔ GitHub issue ↔ branch ↔ pull request, linked",
        "Commits, reviews and merges tracked against the task",
        "Code progress reflects back into project status",
      ]}
      connectsTo="Delivery"
    >
      <MiniApp
        title="GITHUB — TASK #104"
        status={merged ? "MERGED" : "IN REVIEW"}
        statusTone={merged ? "green" : "blue"}
      >
        {/* Dev chain */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          {CHAIN.slice(0, chainShown).map((node, i) => (
            <Reveal key={node.label} show={step >= i + 1} delay={0.04}>
              <span className="inline-flex items-center gap-1.5">
                {i > 0 && <span className="text-[var(--bos-text-tertiary)] opacity-40">→</span>}
                <span
                  className={`px-2 py-1 rounded-sm border text-[9px] tracking-[0.08em] font-mono ${
                    i === CHAIN.length - 1 && merged
                      ? "border-[var(--bos-success)] bg-[var(--bos-success)]/10 text-[var(--bos-success)]"
                      : i === CHAIN.length - 2
                        ? "border-[var(--bos-info)] text-[var(--bos-info)]"
                        : "border-[var(--bos-line)] text-[var(--bos-text-secondary)]"
                  }`}
                >
                  {node.label}
                </span>
              </span>
            </Reveal>
          ))}
        </div>

        {/* Mini code diff */}
        <Reveal show={step >= 3} delay={0.1}>
          <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] font-mono text-[10px] leading-relaxed overflow-hidden">
            <div className="px-3 py-1.5 border-b border-[var(--bos-line)] text-[9px] text-[var(--bos-text-tertiary)] flex items-center justify-between">
              <span>payment/api.ts</span>
              <span>+42 −3</span>
            </div>
            <div className="px-3 py-2">
              <div className="text-[var(--bos-text-tertiary)]">const gateway = await connect(</div>
              <div className="text-[var(--bos-success)]">{`+  provider: "razorpay",`}</div>
              <div className="text-[var(--bos-text-tertiary)]">  key: process.env.RZP_KEY,</div>
              <div className="text-[var(--bos-success)]">+  verify: true</div>
              <div className="text-[var(--bos-text-tertiary)]">{`});`}</div>
            </div>
          </div>
        </Reveal>

        {/* Review state */}
        <Reveal show={step >= 5} delay={0.1}>
          <div className="mt-3 pt-3 border-t border-[var(--bos-line)] flex items-center justify-between">
            <span className="text-[10px] text-[var(--bos-text-secondary)]">
              {merged ? "Merged to main → task marked complete" : "2 approvals · 1 comment"}
            </span>
            <Chip tone={merged ? "green" : "blue"}>{merged ? "MERGED" : "REVIEW"}</Chip>
          </div>
        </Reveal>
      </MiniApp>
    </SceneLayout>
  );
}
