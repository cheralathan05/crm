import { db } from "./db";

export type OnboardingState = {
  overviewComplete: boolean;
  companyName: string | null;
};

/**
 * Read (and lazily create) the onboarding + workspace state for a user.
 * Every authenticated user has exactly one independent record.
 */
export async function getOnboardingState(userId: string): Promise<OnboardingState> {
  const [onboarding, workspace] = await Promise.all([
    db.onboarding.findUnique({ where: { userId } }),
    db.workspace.findUnique({ where: { ownerId: userId }, select: { companyName: true } }),
  ]);

  return {
    overviewComplete: onboarding?.overviewComplete ?? false,
    companyName: workspace?.companyName ?? null,
  };
}

/**
 * Where should an authenticated user land, based on their state?
 *   overview not complete      → /onboarding/overview
 *   overview done, no company  → /onboarding/company
 *   everything done            → /dashboard
 */
export function resolvePostAuthPath(state: OnboardingState): string {
  if (!state.overviewComplete) return "/onboarding/overview";
  if (!state.companyName) return "/onboarding/company";
  return "/dashboard";
}

export async function completeOverview(userId: string): Promise<void> {
  await db.onboarding.upsert({
    where: { userId },
    create: { userId, overviewComplete: true },
    update: { overviewComplete: true },
  });
}

/**
 * Create/update the workspace name and keep User.companyName in sync so the
 * existing session surface (dashboard, mail, auth) stays coherent.
 */
export async function setWorkspaceName(userId: string, companyName: string): Promise<void> {
  const name = companyName.trim();
  await db.workspace.upsert({
    where: { ownerId: userId },
    create: { ownerId: userId, companyName: name },
    update: { companyName: name },
  });
  await db.user.update({ where: { id: userId }, data: { companyName: name } });
}
