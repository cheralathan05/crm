import type { Metadata } from "next";
import { db } from "@/lib/db";
import { resolveRequestByToken } from "@/lib/requirements";
import { WorkspaceError } from "@/components/requirement-workspace/workspace-error";
import { ClientRequirementPortal, type ClientQuestionItem } from "@/components/client-requirement/client-requirement-portal";
import { getProjectUnderstanding, buildReviewQueue } from "@/lib/requirement-collaboration";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project Discovery & Requirements",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

/* ── /client-requirement/[token] — the client's executive workspace ──
   Server resolves the token (hash-compare only — never the raw token in
   the page), then delivers the focused Client Collaboration Portal.
   Zero internal metrics, zero admin notes, zero AI confidence. */

export default async function ClientRequirementPage({ params }: Props) {
  const { token } = await params;
  const resolved = await resolveRequestByToken(token);

  if (!resolved) {
    return <WorkspaceError code="INVALID" />;
  }
  if (resolved.error) {
    return <WorkspaceError code={resolved.error} label={resolved.errorLabel} />;
  }

  const req = resolved.request;

  // Touch last opened at
  await db.requirementRequest
    .update({
      where: { id: req.id },
      data: { lastOpenedAt: new Date() },
    })
    .catch(() => undefined);

  // Load questions, project understanding and recent events for this client
  const [questions, understanding, events, answersRaw] = await Promise.all([
    db.requirementQuestion.findMany({
      where: { requirementId: req.id },
      orderBy: { createdAt: "asc" },
    }),
    getProjectUnderstanding(req.id),
    db.requirementEvent.findMany({
      where: { requestId: req.id },
      select: { id: true, label: true, detail: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.requirementAnswer.findMany({
      where: { requestId: req.id },
    }),
  ]);

  const answersMap: Record<string, any> = {};
  for (const a of answersRaw) {
    try {
      answersMap[a.section] = JSON.parse(a.data);
    } catch {
      answersMap[a.section] = a.data;
    }
  }

  // Map to client question items
  let clientQuestions: ClientQuestionItem[] = [];

  if (questions.length > 0) {
    clientQuestions = questions.map((q) => {
      let parsedOptions: string[] = [];
      try {
        parsedOptions = JSON.parse(q.options);
      } catch {
        parsedOptions = [];
      }

      return {
        id: q.id,
        section: q.section,
        category: q.category ?? q.section,
        question: q.clientQuestion ?? q.question,
        whyWeAsk: q.whyWeAsk ?? "Helps define system access, roles, and functional boundaries.",
        answerType: (q.answerType as any) ?? "LONG_TEXT",
        options: parsedOptions,
        helpText: q.helpText,
        currentAnswer: q.response ?? null,
      };
    });
  } else {
    // If admin hasn't created a custom bundle yet, provide initial review queue items
    const defaultQueue = buildReviewQueue(answersMap, [], []);
    clientQuestions = defaultQueue.slice(0, 3).map((item) => ({
      id: item.id,
      section: item.key,
      category: item.category,
      question: item.suggestedQuestion,
      whyWeAsk: item.whyWeNeedThis,
      answerType: item.responseType,
      options: item.options,
      currentAnswer: item.currentAnswer,
    }));
  }

  const initialBundle = {
    token,
    request: {
      reference: req.reference,
      title: req.title,
      projectType: req.projectType,
      status: req.status,
      companyName: req.client.companyName,
      responderName: req.responderName,
      submittedAt: req.submittedAt ? req.submittedAt.toISOString() : null,
      approvedAt: req.approvedAt ? req.approvedAt.toISOString() : null,
    },
    questions: clientQuestions,
    understanding,
    recentEvents: events.map((e) => ({
      id: e.id,
      label: e.label,
      detail: e.detail,
      createdAt: e.createdAt.toISOString(),
    })),
  };

  return <ClientRequirementPortal initial={initialBundle} />;
}
