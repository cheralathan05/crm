import type { Metadata } from "next";
import { db } from "@/lib/db";
import { resolveQuestionByToken } from "@/lib/questions";
import { getSection } from "@/lib/requirement-config";
import { BusinessOSMark } from "@/components/business-os-mark";
import { QuestionRespondForm } from "@/components/client-question/respond-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Requirement Clarification",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

/* ── /client-question/[token] — the client's secure response page ──
   The client answers a clarification question emailed to them. Token
   is resolved server-side by hash — internal ids and internal notes
   never reach this page. */

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
  const resolved = await resolveQuestionByToken(token);

  if (!resolved) {
    return (
      <ErrorScreen
        title="Link not found"
        heading="This link doesn't look right"
        body="The address may be incomplete, or this isn't a valid clarification link. Check the full link from your email, or ask the team who sent it to resend it."
      />
    );
  }

  if (resolved.error === "EXPIRED") {
    return (
      <ErrorScreen
        title="Link expired"
        heading="This response link has expired"
        body="Secure links expire automatically to protect your information. Ask the team to send you a fresh clarification link."
      />
    );
  }
  if (resolved.error === "REVOKED") {
    return (
      <ErrorScreen
        title="Link no longer active"
        heading="This request has been closed"
        body="This clarification request is no longer open. If this is unexpected, reach out to the team directly."
      />
    );
  }
  if (resolved.error === "ANSWERED") {
    return (
      <ErrorScreen
        title="Already answered"
        heading="You've already responded"
        body="Your answer was received and shared with the project team. Thank you — no further action is needed."
      />
    );
  }
  if (resolved.error === "CANCELLED") {
    return (
      <ErrorScreen
        title="Request closed"
        heading="This question is no longer open"
        body="The team closed this clarification request. If you still need to share information, reach out to them directly."
      />
    );
  }
  if (resolved.error) {
    return (
      <ErrorScreen
        title="Link not found"
        heading="This link doesn't look right"
        body="The address may be incomplete, or this isn't a valid clarification link."
      />
    );
  }

  const question = resolved.question;
  const clientCompany = (question as unknown as { client: { companyName: string } }).client.companyName;
  const projectTitle = (question as unknown as { requirement: { title: string } }).requirement.title;

  // Question context — where this sits among the client's open questions.
  const openQuestions = await db.requirementQuestion.findMany({
    where: { requirementId: question.requirementId, status: { in: ["SENT", "DELIVERED", "OPENED"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const index = openQuestions.findIndex((q) => q.id === question.id) + 1;
  const total = openQuestions.length;

  return (
    <main className="min-h-dvh bg-[var(--bos-bg)] px-6 py-12">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-center mb-8">
          <BusinessOSMark size="md" />
        </div>

        <QuestionRespondForm
          token={token}
          companyName={clientCompany}
          projectTitle={projectTitle}
          sectionLabel={getSection(question.section)?.label ?? question.section}
          question={question.question}
          index={index}
          total={total}
        />
      </div>
    </main>
  );
}
