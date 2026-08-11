"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import {
  MiniApp,
  Avatar,
  Chip,
  Row,
  Tag,
  useSequence,
  useTypewriter,
  Reveal,
} from "../kit";
import { SceneLayout } from "../scene-layout";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────
   Inner panes — each is a slice of the real client
   record that the future module will match.
──────────────────────────────────────────────── */

function ProfilePane() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Avatar name="ABC Technologies" className="w-8 h-8 text-[10px]" />
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-[var(--bos-text-primary)] truncate">
            ABC Technologies
          </div>
          <div className="text-[9px] text-[var(--bos-text-tertiary)]">Project Owner · since 2d</div>
        </div>
        <div className="ml-auto flex gap-1">
          <Chip tone="green" dot={false}>ACTIVE</Chip>
          <Chip tone="neutral" dot={false}>ENTERPRISE</Chip>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4">
        <div>
          <Row label="Email" value="ops@abc.in" />
          <Row label="Phone" value="+91 98•• •• 210" />
          <Row label="Location" value="Bengaluru" />
        </div>
        <div>
          <Row label="Client type" value="Product company" />
          <Row label="Created" value="2d ago" />
          <Row label="Tags" value={<Chip tone="amber" dot={false}>PRIORITY</Chip>} />
        </div>
      </div>

      {/* Deal / payment status */}
      <div className="flex items-center justify-between px-2.5 py-2 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)]">
        <div className="text-[9px] tracking-[0.1em] uppercase text-[var(--bos-text-tertiary)]">
          Open deal
        </div>
        <div className="text-[10px] font-medium text-[var(--bos-text-primary)] tabular-nums">
          ₹6,00,000
        </div>
        <Chip tone="amber">Proposal sent</Chip>
        <Chip tone="blue" dot={false}>Payment pending</Chip>
      </div>
    </div>
  );
}

const CONTACTS = [
  { name: "Arun", role: "Project owner", activity: "replied 2m ago", primary: true },
  { name: "Priya", role: "Finance", activity: "viewed proposal" },
  { name: "Ravi", role: "Tech lead", activity: "commented 1d ago" },
];

function ContactsPane() {
  return (
    <div className="space-y-1.5">
      {CONTACTS.map((contact, i) => (
        <Reveal key={contact.name} show delay={i * 0.08}>
          <div className="flex items-center gap-2.5 py-1.5 border-b border-[var(--bos-line)] last:border-0">
            <Avatar name={contact.name} className="w-6 h-6 text-[8px]" />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-[var(--bos-text-primary)] truncate">
                {contact.name}
                {contact.primary && <Chip tone="accent" dot={false} className="ml-2">PRIMARY</Chip>}
              </div>
              <div className="text-[9px] text-[var(--bos-text-tertiary)]">{contact.role}</div>
            </div>
            <span className="ml-auto text-[9px] text-[var(--bos-text-tertiary)] whitespace-nowrap">
              {contact.activity}
            </span>
          </div>
        </Reveal>
      ))}
      <Reveal show delay={0.3}>
        <div className="text-[9px] text-[var(--bos-text-secondary)] pt-1">
          <span className="text-[var(--bos-text-tertiary)]">Communication:</span> email · WhatsApp · meeting
          — all recorded
        </div>
      </Reveal>
    </div>
  );
}

const TIMELINE = [
  { label: "Lead created", time: "2d" },
  { label: "Contacted", time: "1d" },
  { label: "Intro meeting", time: "1d" },
  { label: "Requirement submitted", time: "2m" },
  { label: "Proposal sent", time: "1m" },
  { label: "Project started", time: "—" },
];

function TimelinePane() {
  const step = useSequence(TIMELINE.length + 1, 550);
  return (
    <div className="relative pl-4 h-full">
      <div className="absolute left-[4px] top-1 bottom-1 w-px bg-[var(--bos-line-strong)]" />
      {TIMELINE.map((event, i) => (
        <Reveal key={event.label} show={step > i} delay={0.04}>
          <div className="relative pb-2">
            <span
              className={cn(
                "absolute -left-4 top-[5px] w-[8px] h-[8px] rounded-full border",
                step > i
                  ? "bg-[var(--bos-accent)] border-[var(--bos-accent)]"
                  : "border-[var(--bos-border-strong)] bg-[var(--bos-bg)]",
              )}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--bos-text-secondary)]">{event.label}</span>
              <span className="text-[9px] text-[var(--bos-text-tertiary)] font-mono">{event.time}</span>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

const ACTIVITY = [
  { time: "10:42", event: "Requirement submitted" },
  { time: "10:46", event: "Admin started review" },
  { time: "11:03", event: "Comment added" },
  { time: "11:10", event: "Requirement approved" },
  { time: "11:22", event: "Proposal sent" },
  { time: "11:48", event: "Proposal approved" },
];

function ActivityPane() {
  const step = useSequence(ACTIVITY.length + 1, 500);
  return (
    <div className="space-y-1">
      {ACTIVITY.slice(0, Math.max(1, step)).map((item, i) => (
        <Reveal key={item.event} show={step > i} delay={0.03}>
          <div className="flex items-center gap-2.5 py-1 border-b border-[var(--bos-line)] last:border-0">
            <span className="w-9 shrink-0 text-[9px] font-mono text-[var(--bos-text-tertiary)]">
              {item.time}
            </span>
            <span className="text-[10px] text-[var(--bos-text-secondary)] truncate">{item.event}</span>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

const DOCUMENTS = [
  { label: "Requirement — E-Commerce", type: "PDF", version: "v2" },
  { label: "Proposal — E-Commerce", type: "PDF", version: "v1" },
  { label: "Engagement letter", type: "DOC", version: "signed" },
  { label: "Wireframes.zip", type: "ZIP", version: "12 files" },
];

function DocumentsPane() {
  const step = useSequence(DOCUMENTS.length + 1, 500);
  return (
    <div className="space-y-1">
      {DOCUMENTS.slice(0, Math.max(1, step)).map((doc, i) => (
        <Reveal key={doc.label} show={step > i} delay={0.03}>
          <div className="flex items-center gap-2.5 py-1.5 border-b border-[var(--bos-line)] last:border-0">
            <span className="px-1 py-0.5 rounded-[2px] text-[8px] font-mono bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]">
              {doc.type}
            </span>
            <span className="text-[10px] text-[var(--bos-text-secondary)] truncate">{doc.label}</span>
            <span className="ml-auto text-[9px] text-[var(--bos-text-tertiary)] font-mono">
              {doc.version}
            </span>
          </div>
        </Reveal>
      ))}
      <Reveal show={step >= DOCUMENTS.length} delay={0.1}>
        <div className="text-[9px] text-[var(--bos-text-secondary)] pt-1">
          Upload · preview · download · version history
        </div>
      </Reveal>
    </div>
  );
}

const LINKS = [
  { label: "REQUIREMENTS", value: "03", tone: "accent" as const },
  { label: "PROPOSALS", value: "02", tone: "blue" as const },
  { label: "PROJECTS", value: "01", tone: "green" as const },
  { label: "PAYMENTS", value: "1 open", tone: "amber" as const },
  { label: "ACTIVITIES", value: "12", tone: "neutral" as const },
  { label: "MESSAGES", value: "04", tone: "neutral" as const },
];

function ConnectionsPane() {
  const step = useSequence(LINKS.length + 1, 450);
  return (
    <div>
      <div className="grid grid-cols-2 gap-1.5">
        {LINKS.slice(0, Math.max(1, step)).map((link, i) => (
          <Reveal key={link.label} show={step > i} delay={0.03}>
            <div className="flex items-center justify-between px-2.5 py-2 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)]">
              <span className="text-[8px] tracking-[0.12em] uppercase text-[var(--bos-text-tertiary)]">
                {link.label}
              </span>
              <Chip tone={link.tone} dot={false}>{link.value}</Chip>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal show={step >= LINKS.length} delay={0.1}>
        <div className="text-[9px] text-[var(--bos-text-secondary)] pt-2">
          Every record on the client — in one connected view.
        </div>
      </Reveal>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Scene
──────────────────────────────────────────────── */

type TabId = "profile" | "contacts" | "timeline" | "activity" | "docs" | "links";

const TABS: { id: TabId; label: string }[] = [
  { id: "profile", label: "PROFILE" },
  { id: "contacts", label: "CONTACTS" },
  { id: "timeline", label: "TIMELINE" },
  { id: "activity", label: "ACTIVITY" },
  { id: "docs", label: "DOCS" },
  { id: "links", label: "LINKS" },
];

const SEARCH_RESULTS = [
  { label: "Task #104 — Build Payment API", module: "TASK" },
  { label: "Requirement — Payments", module: "REQ" },
  { label: "Proposal — Payments scope", module: "PROP" },
  { label: "Project — E-Commerce Platform", module: "PROJECT" },
];

export function ClientScene() {
  const [tab, setTab] = useState<TabId>("profile");
  const [userTouched, setUserTouched] = useState(false);

  // Auto-tour: 0-5 advance through the tabs, 6 triggers the search moment.
  const seq = useSequence(8, 2800);
  const activeTab = userTouched ? tab : TABS[Math.min(seq, TABS.length - 1)].id;
  const searching = seq >= 6;
  const query = useTypewriter(searching ? "payment" : "", 80);

  const switchTab = (next: TabId) => {
    setTab(next);
    setUserTouched(true);
  };

  const Pane: Record<TabId, () => React.ReactElement> = {
    profile: ProfilePane,
    contacts: ContactsPane,
    timeline: TimelinePane,
    activity: ActivityPane,
    docs: DocumentsPane,
    links: ConnectionsPane,
  };
  const ActivePane = Pane[activeTab];

  return (
    <SceneLayout
      code="01"
      label="CLIENTS"
      title="Client intelligence"
      description="A complete client OS — profile, contacts, timeline, activity, documents, deals — with every connected record one click away."
      capabilities={[
        "Profile, contacts, tags and deal / payment status",
        "Relationship timeline and a live activity feed",
        "Documents with versions, always attached to the client",
        "Connected records: requirements, proposals, projects, payments",
        "Global search that links every module",
      ]}
      connectsTo="Requirement"
    >
      <MiniApp title="CLIENT — ABC TECHNOLOGIES" status="ACTIVE" statusTone="green">
        {/* Search row */}
        <div className="relative mb-2.5">
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)]">
            <Search className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
            <span className="text-[10px] text-[var(--bos-text-primary)] font-mono">
              {query}
              {searching && query.length < 7 && (
                <span className="w-[2px] h-[10px] bg-[var(--bos-accent)] inline-block ml-0.5 align-middle animate-pulse" />
              )}
            </span>
            <span className="ml-auto text-[9px] tracking-[0.12em] uppercase text-[var(--bos-text-tertiary)]">
              Search
            </span>
          </div>

          {/* Cross-module search results */}
          <AnimatePresence>
            {searching && query.length >= 3 && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-x-0 top-full z-10 mt-1 rounded-sm border border-[var(--bos-border)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-md)] p-1.5"
              >
                <div className="text-[8px] tracking-[0.16em] uppercase text-[var(--bos-text-tertiary)] px-1.5 pb-1">
                  Connected results
                </div>
                {SEARCH_RESULTS.map((result) => (
                  <div
                    key={result.label}
                    className="flex items-center justify-between gap-2 px-1.5 py-1 rounded-sm hover:bg-[var(--bos-overlay)]"
                  >
                    <span className="text-[10px] text-[var(--bos-text-secondary)] truncate">
                      {result.label}
                    </span>
                    <span className="px-1 py-0.5 rounded-[2px] text-[8px] font-mono bg-[var(--bos-overlay)] text-[var(--bos-text-tertiary)]">
                      {result.module}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tab rail */}
        <div className="flex items-center gap-1 mb-2.5 border-b border-[var(--bos-line)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              aria-pressed={activeTab === t.id}
              className={cn(
                "px-2 py-1.5 text-[8px] tracking-[0.14em] uppercase border-b-2 -mb-px transition-colors",
                activeTab === t.id
                  ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-medium"
                  : "border-transparent text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Active pane */}
        <div className="h-[150px] sm:h-[158px] overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="h-full overflow-y-auto pr-1"
            >
              <ActivePane />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer strip */}
        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[var(--bos-line)]">
          <Tag>Client record</Tag>
          <span className="text-[9px] text-[var(--bos-text-tertiary)]">
            last activity 2m ago · updated live
          </span>
        </div>
      </MiniApp>
    </SceneLayout>
  );
}
