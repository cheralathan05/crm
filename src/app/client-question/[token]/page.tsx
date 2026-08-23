import type { Metadata } from "next";
import { resolveClarificationBundleByToken } from "@/lib/questions";
import { BusinessOSMark } from "@/components/business-os-mark";
import { ClarificationFlow } from "@/components/client-question/clarification-flow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Requirement Clarification",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

/* ── /client-question/[token] — the client's secure clarification page ──
   The token resolves the requirement's whole clarification set. Internal
   notes, ids, quality scores and admin prompts never reach this page. */

function ErrorScreen({ title, heading, body }: { title: string; heading: string; body: string }) {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-16 bg-[var(--bos-bg)]">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <BusinessOSMark size="md" />
        </div>
        <div className="section-number mb-3">{title}</div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)]">{heading}</h1>
        <p className="mt-4 text-[14px] leading-relaxed text-[var(--bos-text-secondary)]">{body}</p>
      </div>
    </main>
  );
}

export default async function ClientQuestionPage({ params }: Props) {
  const { token } = await params;
  const bundle = await resolveClarificationBundleByToken(token);

  if (!bundle) {
    return (
      <ErrorScreen
        title="Link not found"
        heading="This link doesn't look right"
        body="The address may be incomplete, or this isn't a valid clarification link. Check the full link from your email, or ask the team who sent it to resend it."
      />
    );
  }
  if (bundle.error === "EXPIRED") {
    return (
      <ErrorScreen
        title="Link expired"
        heading="This response link has expired"
        body="Secure links expire automatically to protect your information. Ask the team to send you a fresh clarification link."
      />
    );
  }
  if (bundle.error === "REVOKED") {
    return (
      <ErrorScreen
        title="Link no longer active"
        heading="This request has been closed"
        body="This clarification request is no longer open. If this is unexpected, reach out to the team directly."
      />
    );
  }
  if (bundle.error === "CLOSED") {
    return (
      <ErrorScreen
        title="All answered"
        heading="Thank you — everything is answered"
        body="All open clarifications for this project have been responded to. If the team needs anything else they will reach out directly."
      />
    );
  }
  if (bundle.error) {
    return (
      <ErrorScreen
        title="Link not found"
        heading="This link doesn't look right"
        body="The address may be incomplete, or this isn't a valid clarification link."
      />
    );
  }

  return (
    <main className="min-h-dvh bg-[var(--bos-bg)] px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center mb-7">
          <BusinessOSMark size="md" />
        </div>
        <ClarificationFlow token={token} />
      </div>
    </main>
  );
}
