"use client";

import { useState } from "react";
import {
  User,
  Shield,
  Briefcase,
  Users,
  Sparkles,
  Lock,
  Mail,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type EmployeeOnboardingWizardProps = {
  roles: any[];
  teams: any[];
  onClose: () => void;
  onEmployeeCreated: () => void;
};

export function EmployeeOnboardingWizard({
  roles = [],
  teams = [],
  onClose,
  onEmployeeCreated,
}: EmployeeOnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 7;

  // Form State
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("ENGINEERING");
  const [timezone, setTimezone] = useState("UTC+05:30");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("FULL_TIME");

  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const [primaryResponsibility, setPrimaryResponsibility] = useState("");
  const [secondaryResponsibilities, setSecondaryResponsibilities] = useState<string[]>([]);
  const [newSecondary, setNewSecondary] = useState("");

  const [capabilities, setCapabilities] = useState<Array<{ skill: string; level: string }>>([]);
  const [newSkill, setNewSkill] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState("ADVANCED");

  const [capacityTargetHours, setCapacityTargetHours] = useState(40);
  const [sendInvitation, setSendInvitation] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null;
  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || null;

  const handleAddSecondary = () => {
    if (!newSecondary.trim()) return;
    setSecondaryResponsibilities([...secondaryResponsibilities, newSecondary.trim()]);
    setNewSecondary("");
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    setCapabilities([...capabilities, { skill: newSkill.trim(), level: newSkillLevel }]);
    setNewSkill("");
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim()) {
      setError("Full name and email are mandatory.");
      setStep(1);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          preferredName: preferredName.trim() || undefined,
          email: email.trim(),
          phone: phone.trim() || undefined,
          department,
          timezone,
          location: location.trim() || undefined,
          employmentType,
          roleId: selectedRoleId || undefined,
          teamId: selectedTeamId || undefined,
          primaryResponsibility: primaryResponsibility.trim() || undefined,
          secondaryResponsibilities,
          capabilities,
          capacityTargetHours,
          sendInvitation,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setCreatedResult(json);
      } else {
        setError(json.message || "Failed to onboard employee.");
      }
    } catch {
      setError("Network error onboarding employee.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, label: "Identity", icon: User },
    { num: 2, label: "Role", icon: Shield },
    { num: 3, label: "Responsibilities", icon: Briefcase },
    { num: 4, label: "Team", icon: Users },
    { num: 5, label: "Capabilities", icon: Sparkles },
    { num: 6, label: "Access", icon: Lock },
    { num: 7, label: "Review & Send", icon: Mail },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 lg:p-6 animate-in fade-in duration-150">
      <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--bos-border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--bos-accent)] text-white flex items-center justify-center font-bold text-[13px]">
              ⬡
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                Employee Onboarding Workspace
              </h3>
              <p className="text-[11px] text-[var(--bos-text-secondary)]">
                Configure operational identity, assign roles, and dispatch verified secure invitations.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Navigation Bar */}
        <div className="px-6 py-2.5 bg-[var(--bos-bg)] border-b border-[var(--bos-border)] flex items-center justify-between overflow-x-auto gap-2">
          {stepsList.map((s) => {
            const Icon = s.icon;
            const isCurrent = step === s.num;
            const isDone = step > s.num;

            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono transition-colors whitespace-nowrap cursor-pointer",
                  isCurrent
                    ? "bg-[var(--bos-accent)] text-white font-bold"
                    : isDone
                      ? "text-emerald-600 bg-emerald-500/10 font-medium"
                      : "text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>0{s.num} {s.label}</span>
              </button>
            );
          })}
        </div>

        {createdResult ? (
          <div className="p-8 text-center space-y-6 max-w-xl mx-auto my-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600 block mb-1">
                EMPLOYEE ONBOARDED SUCCESSFULLY
              </span>
              <h2 className="text-xl font-bold text-[var(--bos-text-primary)]">
                {createdResult.employee.fullName} ({createdResult.employee.employeeCode})
              </h2>
              <p className="text-xs text-[var(--bos-text-secondary)] mt-1 font-mono">
                {createdResult.employee.email} · {createdResult.employee.role?.name || "Team Member"}
              </p>
            </div>

            {createdResult.invitation?.activationUrl && (
              <div className="p-4 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-mono font-bold uppercase text-[var(--bos-accent)]">
                    SECURE INVITATION & ACTIVATION LINK
                  </span>
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                    Valid for 7 days
                  </span>
                </div>

                <div className="p-2.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-lg font-mono text-xs text-[var(--bos-text-primary)] break-all select-all">
                  {createdResult.invitation.activationUrl}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(createdResult.invitation.activationUrl)}
                    className="flex-1 py-2 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>{copied ? "✓ Copied to Clipboard!" : "Copy Activation Link"}</span>
                  </button>

                  <a
                    href={createdResult.invitation.activationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] text-xs font-mono font-semibold rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <span>Open in New Tab</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={onEmployeeCreated}
                className="w-full py-2.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:bg-[var(--bos-bg)] text-[var(--bos-text-primary)] text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer"
              >
                Return to Workforce Directory
              </button>
            </div>
          </div>
        ) : (
          <>
          {/* Main Body (Left: Form, Right: Live Preview) */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Form Area (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[12px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: IDENTITY */}
            {step === 1 && (
              <div className="space-y-3.5">
                <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">01. Identity & Contact</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Elena Rostova"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px] focus:outline-hidden focus:border-[var(--bos-accent)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Preferred Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Elena"
                      value={preferredName}
                      onChange={(e) => setPreferredName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px] focus:outline-hidden focus:border-[var(--bos-accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Work Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="elena@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px] focus:outline-hidden focus:border-[var(--bos-accent)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 019-2831"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px] focus:outline-hidden focus:border-[var(--bos-accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Department</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px]"
                    >
                      <option value="ENGINEERING">Engineering</option>
                      <option value="DESIGN">Design & UX</option>
                      <option value="PRODUCT">Product</option>
                      <option value="QA">QA & Testing</option>
                      <option value="OPERATIONS">Operations</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Employment Type</label>
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px]"
                    >
                      <option value="FULL_TIME">Full-Time (40h/wk)</option>
                      <option value="PART_TIME">Part-Time (20h/wk)</option>
                      <option value="CONTRACTOR">Contractor / Specialist</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: ROLE */}
            {step === 2 && (
              <div className="space-y-3.5">
                <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">02. Select Organization Role</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {roles.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRoleId(r.id)}
                      className={cn(
                        "p-3.5 rounded-xl border transition-all cursor-pointer",
                        selectedRoleId === r.id
                          ? "bg-[var(--bos-accent-subtle)] border-[var(--bos-accent)] shadow-xs"
                          : "bg-[var(--bos-bg)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/60",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-[13px] text-[var(--bos-text-primary)]">{r.name}</strong>
                        <span className="text-[10px] font-mono text-[var(--bos-accent)] font-bold">{r.code}</span>
                      </div>
                      <p className="text-[11.5px] text-[var(--bos-text-secondary)] mt-1 line-clamp-2">{r.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: RESPONSIBILITIES */}
            {step === 3 && (
              <div className="space-y-3.5">
                <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">03. Responsibility Designer</h4>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Primary Delivery Focus</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Lead database architecture, migration pipelines, and API transaction performance."
                    value={primaryResponsibility}
                    onChange={(e) => setPrimaryResponsibility(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12.5px] focus:outline-hidden focus:border-[var(--bos-accent)]"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-mono text-[var(--bos-text-secondary)]">Secondary Accountabilities</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add accountability..."
                      value={newSecondary}
                      onChange={(e) => setNewSecondary(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12px]"
                    />
                    <button
                      type="button"
                      onClick={handleAddSecondary}
                      className="px-3 py-1 bg-[var(--bos-accent)] text-white rounded-lg text-[12px] font-medium cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                  <ul className="space-y-1 text-[12px] text-[var(--bos-text-secondary)]">
                    {secondaryResponsibilities.map((sr, idx) => (
                      <li key={idx} className="flex items-center justify-between p-2 bg-[var(--bos-bg)] rounded border border-[var(--bos-border)]">
                        <span>• {sr}</span>
                        <button
                          type="button"
                          onClick={() => setSecondaryResponsibilities(secondaryResponsibilities.filter((_, i) => i !== idx))}
                          className="text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* STEP 4: TEAM */}
            {step === 4 && (
              <div className="space-y-3.5">
                <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">04. Team Assignment</h4>
                <div className="space-y-2">
                  {teams.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTeamId(t.id)}
                      className={cn(
                        "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                        selectedTeamId === t.id
                          ? "bg-[var(--bos-accent-subtle)] border-[var(--bos-accent)]"
                          : "bg-[var(--bos-bg)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/60",
                      )}
                    >
                      <div>
                        <strong className="text-[13px] text-[var(--bos-text-primary)]">{t.name}</strong>
                        <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)] block">{t.department}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[var(--bos-accent)]">{t.code}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 5: CAPABILITIES */}
            {step === 5 && (
              <div className="space-y-3.5">
                <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">05. Capability Profile</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Skill (e.g. Next.js, PostgreSQL, Docker)..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12px]"
                  />
                  <select
                    value={newSkillLevel}
                    onChange={(e) => setNewSkillLevel(e.target.value)}
                    className="px-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[12px]"
                  >
                    <option value="EXPERT">Expert</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-1 bg-[var(--bos-accent)] text-white rounded-lg text-[12px] font-medium cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto">
                  {capabilities.map((c, idx) => (
                    <div key={idx} className="p-2 bg-[var(--bos-bg)] rounded border border-[var(--bos-border)] flex items-center justify-between text-[11.5px]">
                      <div>
                        <strong className="text-[var(--bos-text-primary)]">{c.skill}</strong>
                        <span className="text-[9.5px] font-mono text-[var(--bos-accent)] block uppercase">{c.level}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCapabilities(capabilities.filter((_, i) => i !== idx))}
                        className="text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 6: ACCESS */}
            {step === 6 && (
              <div className="space-y-3.5">
                <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">06. Access & Permissions</h4>
                <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-2 text-[12px]">
                  <span className="text-[10.5px] font-mono uppercase font-bold text-[var(--bos-accent)] block">
                    EFFECTIVE ROLE PERMISSIONS: {selectedRole?.name || "General"}
                  </span>
                  <div className="space-y-1 text-[var(--bos-text-secondary)] font-mono text-[11.5px]">
                    <div>✓ Projects: View & Edit Assigned Deliverables</div>
                    <div>✓ Tasks: View, Complete & Record Verification Evidence</div>
                    <div>✓ Requirements: View Scope Baselines</div>
                    <div>✕ Billing & Invoices: Restricted</div>
                    <div>✕ System Administration: Restricted</div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7: REVIEW */}
            {step === 7 && (
              <div className="space-y-3.5">
                <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">07. Review & Send Invitation</h4>
                <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-2 text-[12px]">
                  <div className="flex justify-between py-1 border-b border-[var(--bos-border)]/60">
                    <span className="text-[var(--bos-text-tertiary)]">Recipient:</span>
                    <strong className="text-[var(--bos-text-primary)]">{fullName} ({email})</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--bos-border)]/60">
                    <span className="text-[var(--bos-text-tertiary)]">Role:</span>
                    <strong className="text-[var(--bos-accent)]">{selectedRole?.name || "Standard"}</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--bos-text-tertiary)]">Team:</span>
                    <strong className="text-[var(--bos-text-primary)]">{selectedTeam?.name || "General"}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="sendInvite"
                    checked={sendInvitation}
                    onChange={(e) => setSendInvitation(e.target.checked)}
                    className="rounded border-[var(--bos-border)] accent-[var(--bos-accent)] cursor-pointer"
                  />
                  <label htmlFor="sendInvite" className="text-[12px] text-[var(--bos-text-secondary)] cursor-pointer">
                    Immediately dispatch cryptographic invitation email upon creation
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Live Preview Panel (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] block">
              LIVE PROFILE PREVIEW
            </span>

            <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] flex items-center justify-center font-bold font-mono text-[13px] border border-[var(--bos-accent)]/20">
                  {fullName ? fullName.slice(0, 2).toUpperCase() : "EM"}
                </div>
                <div>
                  <h4 className="text-[13.5px] font-bold text-[var(--bos-text-primary)]">
                    {fullName || "New Employee"}
                  </h4>
                  <span
                    className={cn(
                      "text-[11px] font-mono block",
                      selectedRole
                        ? "text-[var(--bos-accent)] font-semibold"
                        : "text-[var(--bos-text-tertiary)] italic"
                    )}
                  >
                    {selectedRole ? selectedRole.name : "Role unassigned (Select in Step 02)"}
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-[var(--bos-text-secondary)] space-y-1 pt-2 border-t border-[var(--bos-border)]/60">
                <div>Email: {email || "—"}</div>
                <div>Team: {selectedTeam ? selectedTeam.name : "Unassigned (Select in Step 04)"}</div>
                <div>Capacity Target: {capacityTargetHours}h/week</div>
                <div>Capabilities: {capabilities.length} defined</div>
              </div>
            </div>
          </div>

        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-3.5 border-t border-[var(--bos-border)] bg-[var(--bos-bg)] flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--bos-border)] text-[12px] font-medium text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] disabled:opacity-40 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[12px] font-semibold transition-all cursor-pointer shadow-xs"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Onboarding & Dispatching...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete Onboarding</span>
                </>
              )}
            </button>
          )}
        </div>
        </>
        )}

      </div>
    </div>
  );
}
