"use client";

import { useEffect, useState, use, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Sparkles,
  Layers,
  FolderKanban,
  UserCheck,
  Check,
} from "lucide-react";

export default function InviteActivationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchInvitation = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/invitations/${token}`);
        const json = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(json.message || "Invalid or expired invitation link.");
        }

        if (isMounted) {
          setInvitation(json.data);
          if (json.data.recipientName) {
            setFullName(json.data.recipientName);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load invitation.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (token) fetchInvitation();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleAccept = async (e: FormEvent) => {
    e.preventDefault();
    if (!invitation.hasExistingAccount) {
      if (!password || password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/invitations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          password: password ? password : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Failed to accept invitation.");
      }

      setSuccessData(json.data);

      setTimeout(() => {
        router.push(json.data.redirectUrl || `/employee?projectId=${json.data.projectId}`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Error accepting invitation.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 font-mono text-xs text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span>Validating project security token...</span>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/90 border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Invalid or Expired Invitation</h2>
          <p className="text-xs text-slate-400 leading-relaxed font-mono">{error}</p>
          <button
            onClick={() => router.push("/auth/employee/login")}
            className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-200 transition"
          >
            Go to Employee Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background aesthetic glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl">
        <div className="rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-8 sm:p-10 shadow-2xl space-y-8">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Project Execution Portal Invitation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              You&apos;ve been invited to join
            </h1>
            <p className="text-xl font-bold text-blue-400">
              {invitation.projectName}
            </p>
            <p className="text-xs text-slate-400 font-mono">
              as <strong className="text-emerald-400">{invitation.projectRole}</strong> on the{" "}
              <strong className="text-white">{invitation.teamName}</strong> team
            </p>
          </div>

          {/* Invitation Specs Strip */}
          <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4 font-mono">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">PROJECT</span>
                <span className="text-xs font-bold text-slate-200 truncate block">{invitation.projectName}</span>
                {invitation.projectCode && (
                  <span className="text-[10px] text-blue-400 block">{invitation.projectCode}</span>
                )}
              </div>
              <div className="space-y-1 border-l border-slate-800/80 px-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">CLIENT</span>
                <span className="text-xs font-bold text-slate-300 truncate block">
                  {invitation.clientCompany || "Enterprise Client"}
                </span>
              </div>
              <div className="space-y-1 border-l border-slate-800/80 px-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">SQUAD</span>
                <span className="text-xs font-bold text-blue-400 block">{invitation.teamName} TEAM</span>
              </div>
              <div className="space-y-1 border-l border-slate-800/80 px-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">ROLE</span>
                <span className="text-xs font-bold text-emerald-400 truncate block">{invitation.projectRole}</span>
              </div>
            </div>

            {/* Product Scope & Boundaries */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[11px] space-y-2 text-left">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                  SQUAD RESPONSIBILITY
                </span>
                <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
                  {invitation.responsibility}
                </p>
              </div>

              {invitation.approvedProductAreas && invitation.approvedProductAreas.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                    APPROVED MVP PRODUCT SCOPE
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {invitation.approvedProductAreas.map((area: string) => (
                      <span
                        key={area}
                        className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px]"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 text-[10px] text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Strict Role Boundary Active: You receive only verified {invitation.teamName.toLowerCase()} responsibilities. Zero task pollution.</span>
              </div>
            </div>
          </div>

          {/* Status Feedback */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-mono flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successData ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3 font-mono">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-emerald-300">Project Membership Activated!</h3>
              <p className="text-xs text-slate-400">
                Directing to {successData.projectName} {successData.teamName} Portal...
              </p>
            </div>
          ) : (
            <form onSubmit={handleAccept} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                  Work Email (Assigned)
                </label>
                <input
                  type="email"
                  disabled
                  value={invitation.recipientEmail}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {!invitation.hasExistingAccount ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                      Set Portal Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </>
              ) : (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-mono">
                  Welcome back, <strong>{invitation.existingUserName || invitation.recipientEmail}</strong>! Click below to confirm membership and enter this project.
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activating Project Membership...</span>
                  </>
                ) : (
                  <>
                    <span>Accept Invitation &amp; Enter Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="text-center pt-2">
            <p className="text-[11px] text-slate-500 font-mono">
              Project membership defines strict execution boundary. Zero data leakage across projects.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
