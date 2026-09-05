import { db } from "./db";
import { emptyConfig, parseList, toList, type WorkspaceConfig } from "./workspace-config";

export type OnboardingState = {
  overviewComplete: boolean;
  workspaceSetupComplete: boolean;
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
    workspaceSetupComplete: onboarding?.workspaceSetupComplete ?? false,
    companyName: workspace?.companyName ?? null,
  };
}

/**
 * Where should an authenticated user land, based on their state?
 *   overview not complete      → /onboarding/overview
 *   overview done, no setup    → /onboarding/workspace
 *   workspace configured       → /dashboard
 */
export function resolvePostAuthPath(state: OnboardingState): string {
  if (!state.overviewComplete) return "/onboarding/overview";
  if (!state.workspaceSetupComplete) return "/onboarding/workspace";
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
 * Legacy single-step workspace creation (kept for compatibility with the
 * earlier company-name flow). Marks the setup complete so the user reaches
 * the dashboard. The new Workspace Creation Engine uses autosave + the
 * dedicated completion transaction instead.
 */
export async function setWorkspaceName(userId: string, companyName: string): Promise<void> {
  const name = companyName.trim();
  await db.workspace.upsert({
    where: { ownerId: userId },
    create: { ownerId: userId, companyName: name },
    update: { companyName: name },
  });
  await db.user.update({ where: { id: userId }, data: { companyName: name } });
  await db.onboarding.upsert({
    where: { userId },
    create: { userId, overviewComplete: true, workspaceSetupComplete: true, workspaceSetupCompletedAt: new Date() },
    update: { workspaceSetupComplete: true, workspaceSetupCompletedAt: new Date() },
  });
}

/* ────────────────────────────────────────────────────────────────
   Workspace Creation Engine — configuration persistence
   Everything is resolved from the authenticated userId. The client
   never supplies ids; every query is workspace-scoped.
──────────────────────────────────────────────────────────────── */

type ConfigRow = {
  profile: Awaited<ReturnType<typeof db.workspaceProfile.findUnique>>;
  business: Awaited<ReturnType<typeof db.businessProfile.findUnique>>;
  preferences: Awaited<ReturnType<typeof db.workspacePreferences.findUnique>>;
  notifications: Awaited<ReturnType<typeof db.notificationPreferences.findUnique>>;
  setup: Awaited<ReturnType<typeof db.workspaceSetup.findUnique>>;
};

function rowsToConfig(companyName: string, rows: ConfigRow): WorkspaceConfig {
  const empty = emptyConfig();
  return {
    companyName,
    profile: {
      legalName: rows.profile?.legalName ?? empty.profile.legalName,
      website: rows.profile?.website ?? empty.profile.website,
      businessEmail: rows.profile?.businessEmail ?? empty.profile.businessEmail,
      businessPhone: rows.profile?.businessPhone ?? empty.profile.businessPhone,
    },
    business: {
      industry: rows.business?.industry ?? empty.business.industry,
      businessType: rows.business?.businessType ?? empty.business.businessType,
      businessModel: rows.business?.businessModel ?? empty.business.businessModel,
      description: rows.business?.description ?? empty.business.description,
      services: parseList(rows.business?.services),
      targetCustomers: parseList(rows.business?.targetCustomers),
    },
    setup: {
      leadSources: parseList(rows.setup?.leadSources),
      approvalFlow: parseList(rows.setup?.approvalFlow),
      executionMode: rows.setup?.executionMode ?? empty.setup.executionMode,
      teamSize: rows.setup?.teamSize ?? empty.setup.teamSize,
      roles: parseList(rows.setup?.roles),
      workTypes: parseList(rows.setup?.workTypes),
      projectDuration: rows.setup?.projectDuration ?? empty.setup.projectDuration,
      clientVolume: rows.setup?.clientVolume ?? empty.setup.clientVolume,
      currentTools: parseList(rows.setup?.currentTools),
    },
    preferences: {
      theme: (rows.preferences?.theme as WorkspaceConfig["preferences"]["theme"]) ?? empty.preferences.theme,
      defaultLanding: rows.preferences?.defaultLanding ?? empty.preferences.defaultLanding,
      timezone: rows.preferences?.timezone ?? empty.preferences.timezone,
      dateFormat: rows.preferences?.dateFormat ?? empty.preferences.dateFormat,
    },
    notifications: {
      email: rows.notifications?.email ?? empty.notifications.email,
      tasks: rows.notifications?.tasks ?? empty.notifications.tasks,
      clients: rows.notifications?.clients ?? empty.notifications.clients,
      projects: rows.notifications?.projects ?? empty.notifications.projects,
      proposals: rows.notifications?.proposals ?? empty.notifications.proposals,
      system: rows.notifications?.system ?? empty.notifications.system,
    },
  };
}

/** Resume: full saved configuration for the authenticated user (null if none). */
export async function getWorkspaceConfig(userId: string): Promise<WorkspaceConfig | null> {
  const workspace = await db.workspace.findUnique({
    where: { ownerId: userId },
    select: { id: true, companyName: true },
  });
  if (!workspace) return null;

  const [profile, business, preferences, notifications, setup] = await Promise.all([
    db.workspaceProfile.findUnique({ where: { workspaceId: workspace.id } }),
    db.businessProfile.findUnique({ where: { workspaceId: workspace.id } }),
    db.workspacePreferences.findUnique({ where: { workspaceId: workspace.id } }),
    db.notificationPreferences.findUnique({ where: { workspaceId: workspace.id } }),
    db.workspaceSetup.findUnique({ where: { workspaceId: workspace.id } }),
  ]);

  return rowsToConfig(workspace.companyName, { profile, business, preferences, notifications, setup });
}

/**
 * Autosave — idempotent full-config upsert, workspace-scoped by session.
 * Creates the workspace on first save (identity step). Does NOT mark the
 * setup complete; that happens only in the final transaction.
 */
export async function saveWorkspaceConfig(userId: string, config: WorkspaceConfig): Promise<WorkspaceConfig> {
  // Never downgrade an existing name with a partial autosave that omitted it.
  const trimmed = config.companyName.trim();
  let companyName = trimmed;
  if (!companyName) {
    const existing = await db.workspace.findUnique({
      where: { ownerId: userId },
      select: { companyName: true },
    });
    companyName = existing?.companyName || "Your Workspace";
  }

  const workspace = await db.workspace.upsert({
    where: { ownerId: userId },
    create: { ownerId: userId, companyName },
    update: { companyName },
  });

  // Each row is atomic on its own; every one is workspace-scoped and resolved
  // from the session, never from client-supplied ids.
  const [profile, business, preferences, notifications, setup] = await Promise.all([
    db.workspaceProfile.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        legalName: config.profile.legalName || null,
        website: config.profile.website || null,
        businessEmail: config.profile.businessEmail || null,
        businessPhone: config.profile.businessPhone || null,
      },
      update: {
        legalName: config.profile.legalName || null,
        website: config.profile.website || null,
        businessEmail: config.profile.businessEmail || null,
        businessPhone: config.profile.businessPhone || null,
      },
    }),
    db.businessProfile.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        industry: config.business.industry || null,
        businessType: config.business.businessType || null,
        businessModel: config.business.businessModel || null,
        description: config.business.description || null,
        services: toList(config.business.services),
        targetCustomers: toList(config.business.targetCustomers),
      },
      update: {
        industry: config.business.industry || null,
        businessType: config.business.businessType || null,
        businessModel: config.business.businessModel || null,
        description: config.business.description || null,
        services: toList(config.business.services),
        targetCustomers: toList(config.business.targetCustomers),
      },
    }),
    db.workspacePreferences.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        theme: config.preferences.theme,
        defaultLanding: config.preferences.defaultLanding,
        timezone: config.preferences.timezone,
        dateFormat: config.preferences.dateFormat,
      },
      update: {
        theme: config.preferences.theme,
        defaultLanding: config.preferences.defaultLanding,
        timezone: config.preferences.timezone,
        dateFormat: config.preferences.dateFormat,
      },
    }),
    db.notificationPreferences.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        email: config.notifications.email,
        tasks: config.notifications.tasks,
        clients: config.notifications.clients,
        projects: config.notifications.projects,
        proposals: config.notifications.proposals,
        system: config.notifications.system,
      },
      update: {
        email: config.notifications.email,
        tasks: config.notifications.tasks,
        clients: config.notifications.clients,
        projects: config.notifications.projects,
        proposals: config.notifications.proposals,
        system: config.notifications.system,
      },
    }),
    db.workspaceSetup.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        leadSources: toList(config.setup.leadSources),
        approvalFlow: toList(config.setup.approvalFlow),
        executionMode: config.setup.executionMode || null,
        teamSize: config.setup.teamSize || null,
        roles: toList(config.setup.roles),
        workTypes: toList(config.setup.workTypes),
        projectDuration: config.setup.projectDuration || null,
        clientVolume: config.setup.clientVolume || null,
        currentTools: toList(config.setup.currentTools),
      },
      update: {
        leadSources: toList(config.setup.leadSources),
        approvalFlow: toList(config.setup.approvalFlow),
        executionMode: config.setup.executionMode || null,
        teamSize: config.setup.teamSize || null,
        roles: toList(config.setup.roles),
        workTypes: toList(config.setup.workTypes),
        projectDuration: config.setup.projectDuration || null,
        clientVolume: config.setup.clientVolume || null,
        currentTools: toList(config.setup.currentTools),
      },
    }),
  ]);

  // Keep the session-facing user record in sync (navbar, dashboard, mail).
  await db.user.update({ where: { id: userId }, data: { companyName } });

  return rowsToConfig(companyName, { profile, business, preferences, notifications, setup });
}

/**
 * Final transaction — "CREATE MY WORKSPACE".
 * Ensures every row exists and belongs to this workspace, then marks the
 * onboarding complete. The user never reaches /dashboard before this.
 */
export async function completeWorkspaceSetup(userId: string, config: WorkspaceConfig): Promise<WorkspaceConfig> {
  const saved = await saveWorkspaceConfig(userId, config);

  await db.$transaction([
    db.onboarding.upsert({
      where: { userId },
      create: {
        userId,
        overviewComplete: true,
        workspaceSetupComplete: true,
        workspaceSetupCompletedAt: new Date(),
      },
      update: {
        overviewComplete: true,
        workspaceSetupComplete: true,
        workspaceSetupCompletedAt: new Date(),
      },
    }),
  ]);

  return saved;
}
