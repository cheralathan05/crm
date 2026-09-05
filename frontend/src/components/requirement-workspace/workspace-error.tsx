import { BusinessOSMark } from "@/components/business-os-mark";

/* ────────────────────────────────────────────────────────────────
   SECURE LINK — ERROR STATES
   Invalid, expired and revoked links each get a designed screen that
   says what happened and what the client can do next. Never reveals
   internal ids, other clients, or workspace details.
──────────────────────────────────────────────────────────────── */

const CONTENT: Record<
  string,
  { title: string; heading: string; body: string; action: string }
> = {
  INVALID: {
    title: "Link not found",
    heading: "This link doesn't look right",
    body: "The address may be incomplete, or this isn't a valid project discovery link. Check the full link from your email, or ask the team who sent it to resend it.",
    action: "Contact the team who invited you",
  },
  EXPIRED: {
    title: "Link expired",
    heading: "Your project link has expired",
    body: "Secure links expire automatically to protect your information. Ask the team to send you a fresh link — your saved answers can continue from where you left off.",
    action: "Request a new link",
  },
  REVOKED: {
    title: "Access revoked",
    heading: "This workspace is no longer active",
    body: "Access to this project discovery workspace has been closed by the team that created it. If this is unexpected, reach out to them directly.",
    action: "Contact the team who invited you",
  },
};

export function WorkspaceError({ code, label }: { code: string; label?: string | null }) {
  const content = CONTENT[code] ?? CONTENT.INVALID;

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-16 bg-[var(--bos-bg)]">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <BusinessOSMark size="md" />
        </div>

        <div className="section-number mb-3">{content.title}</div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)]">
          {content.heading}
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-[var(--bos-text-secondary)]">
          {content.body}
        </p>

        {code === "REVOKED" && label && (
          <p className="mt-3 text-[12px] text-[var(--bos-text-tertiary)] italic">{label}</p>
        )}

        <div className="mt-8 h-px w-24 mx-auto bg-[var(--bos-line-strong)]" aria-hidden="true" />
        <p className="mt-6 text-[11px] text-[var(--bos-text-tertiary)]">{content.action}</p>
      </div>
    </main>
  );
}
