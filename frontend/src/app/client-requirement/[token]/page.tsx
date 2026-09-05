import type { Metadata } from "next";
import { resolveRequestByToken, serializePublicRequest } from "@/lib/requirements";
import { WorkspaceShell } from "@/components/requirement-workspace/workspace-shell";
import { WorkspaceError } from "@/components/requirement-workspace/workspace-error";
import type { PublicBundle } from "@/components/requirement-workspace/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project Discovery",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

/* ── /client-requirement/[token] — the client's private workspace ──
   Server resolves the token (hash-compare only — never the raw token in
   the page), then hands a serialized bundle to the client shell. No
   admin navigation, employees, internal notes or other clients ever
   reach this page. */

export default async function ClientRequirementPage({ params }: Props) {
  const { token } = await params;
  const resolved = await resolveRequestByToken(token);

  if (!resolved) {
    return <WorkspaceError code="INVALID" />;
  }
  if (resolved.error) {
    return <WorkspaceError code={resolved.error} label={resolved.errorLabel} />;
  }

  const bundle = (await serializePublicRequest(resolved.request)) as unknown as PublicBundle;
  return <WorkspaceShell token={token} initial={bundle} />;
}
