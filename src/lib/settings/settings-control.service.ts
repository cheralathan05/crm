import { db } from "@/lib/db";
import {
  CONFIGURATION_REGISTRY,
  SettingDefinition,
} from "./configuration-registry";

export interface ResolvedSetting {
  key: string;
  definition: SettingDefinition;
  currentValue: any;
  defaultValue: any;
  source: "SYSTEM_DEFAULT" | "WORKSPACE" | "ORGANIZATION" | "PROJECT_OVERRIDE";
  scope: string;
  isLocked: boolean;
  lockReason: string | null;
  version: number;
  updatedAt: string;
  updatedByName: string;
}

/**
 * Ensures workspace has initialized settings in WorkspaceControlSetting table.
 * Fallback to CONFIGURATION_REGISTRY defaults if record does not yet exist.
 */
export async function ensureWorkspaceSettings(workspaceId: string): Promise<void> {
  const existing = await db.workspaceControlSetting.findMany({
    where: { workspaceId },
    select: { key: true },
  });

  const existingKeys = new Set(existing.map((e) => e.key));
  const missingKeys = Object.keys(CONFIGURATION_REGISTRY).filter(
    (k) => !existingKeys.has(k)
  );

  if (missingKeys.length === 0) return;

  const recordsToCreate = missingKeys.map((key) => {
    const def = CONFIGURATION_REGISTRY[key];
    return {
      workspaceId,
      key,
      category: def.category,
      scope: def.scope,
      value: JSON.stringify(def.defaultValue),
      defaultValue: JSON.stringify(def.defaultValue),
      source: "SYSTEM_DEFAULT",
      sensitivity: def.sensitivity,
      isLocked: false,
      version: 1,
      updatedByName: "System",
    };
  });

  // Batch insert
  await db.workspaceControlSetting.createMany({
    data: recordsToCreate,
  });
}

/**
 * Resolves a single setting for a workspace
 */
export async function getSetting(
  workspaceId: string,
  key: string
): Promise<ResolvedSetting | null> {
  const definition = CONFIGURATION_REGISTRY[key];
  if (!definition) return null;

  let record = await db.workspaceControlSetting.findUnique({
    where: {
      workspaceId_key: { workspaceId, key },
    },
  });

  if (!record) {
    // Return registered default
    return {
      key,
      definition,
      currentValue: definition.defaultValue,
      defaultValue: definition.defaultValue,
      source: "SYSTEM_DEFAULT",
      scope: definition.scope,
      isLocked: false,
      lockReason: null,
      version: 1,
      updatedAt: new Date().toISOString(),
      updatedByName: "System",
    };
  }

  let parsedVal = definition.defaultValue;
  try {
    parsedVal = JSON.parse(record.value);
  } catch {
    parsedVal = record.value;
  }

  return {
    key,
    definition,
    currentValue: parsedVal,
    defaultValue: definition.defaultValue,
    source: record.source as any,
    scope: record.scope,
    isLocked: record.isLocked,
    lockReason: record.lockReason,
    version: record.version,
    updatedAt: record.updatedAt.toISOString(),
    updatedByName: record.updatedByName,
  };
}

/**
 * Returns all settings for a workspace, optionally filtered by category
 */
export async function getAllSettings(
  workspaceId: string,
  category?: string
): Promise<ResolvedSetting[]> {
  await ensureWorkspaceSettings(workspaceId);

  const query: any = { where: { workspaceId } };
  if (category) {
    query.where.category = category;
  }

  const records = await db.workspaceControlSetting.findMany({
    ...query,
    orderBy: { key: "asc" },
  });

  const recordMap = new Map(records.map((r) => [r.key, r]));

  return Object.values(CONFIGURATION_REGISTRY)
    .filter((def) => !category || def.category === category)
    .map((definition) => {
      const record = recordMap.get(definition.key);
      if (!record) {
        return {
          key: definition.key,
          definition,
          currentValue: definition.defaultValue,
          defaultValue: definition.defaultValue,
          source: "SYSTEM_DEFAULT" as const,
          scope: definition.scope,
          isLocked: false,
          lockReason: null,
          version: 1,
          updatedAt: new Date().toISOString(),
          updatedByName: "System",
        };
      }

      let parsedVal = definition.defaultValue;
      try {
        parsedVal = JSON.parse(record.value);
      } catch {
        parsedVal = record.value;
      }

      return {
        key: definition.key,
        definition,
        currentValue: parsedVal,
        defaultValue: definition.defaultValue,
        source: record.source as any,
        scope: record.scope,
        isLocked: record.isLocked,
        lockReason: record.lockReason,
        version: record.version,
        updatedAt: record.updatedAt.toISOString(),
        updatedByName: record.updatedByName,
      };
    });
}

/**
 * Sets a setting with safe transactional versioning and audit logging.
 */
export async function setSetting(
  workspaceId: string,
  key: string,
  newValue: any,
  actor: { id: string; name: string; role?: string },
  reason?: string
): Promise<{ ok: boolean; version: number; error?: string }> {
  const definition = CONFIGURATION_REGISTRY[key];
  if (!definition) {
    return { ok: false, version: 0, error: `Setting ${key} does not exist in registry.` };
  }

  // Permission check
  const actorRole = (actor.role?.toUpperCase() || "MEMBER") as "OWNER" | "ADMIN" | "MEMBER";
  if (!definition.editableBy.includes(actorRole) && actorRole !== "OWNER") {
    return {
      ok: false,
      version: 0,
      error: `Forbidden: Only ${definition.editableBy.join(" or ")} can change ${definition.name}.`,
    };
  }

  const existing = await db.workspaceControlSetting.findUnique({
    where: { workspaceId_key: { workspaceId, key } },
  });

  if (existing?.isLocked) {
    return {
      ok: false,
      version: existing.version,
      error: `Setting is locked by organization policy: ${existing.lockReason || "Policy restriction"}.`,
    };
  }

  const beforeValStr = existing ? existing.value : JSON.stringify(definition.defaultValue);
  const afterValStr = JSON.stringify(newValue);

  // If no change, return early
  if (beforeValStr === afterValStr && existing) {
    return { ok: true, version: existing.version };
  }

  const newVersionNumber = (existing?.version || 1) + 1;

  // Execute in Prisma transaction
  await db.$transaction(async (tx) => {
    // 1. Upsert setting
    await tx.workspaceControlSetting.upsert({
      where: { workspaceId_key: { workspaceId, key } },
      create: {
        workspaceId,
        key,
        category: definition.category,
        scope: definition.scope,
        value: afterValStr,
        defaultValue: JSON.stringify(definition.defaultValue),
        source: "WORKSPACE",
        sensitivity: definition.sensitivity,
        version: 2,
        updatedById: actor.id,
        updatedByName: actor.name,
      },
      update: {
        value: afterValStr,
        source: "WORKSPACE",
        version: newVersionNumber,
        updatedById: actor.id,
        updatedByName: actor.name,
        updatedAt: new Date(),
      },
    });

    // 2. Write immutable version record
    await tx.configurationVersion.create({
      data: {
        workspaceId,
        settingKey: key,
        version: newVersionNumber,
        beforeValue: beforeValStr,
        afterValue: afterValStr,
        reason: reason || "Setting updated via Control Plane",
        changedById: actor.id,
        changedByName: actor.name,
      },
    });

    // 3. Write immutable audit log
    await tx.configurationAuditEvent.create({
      data: {
        workspaceId,
        actorId: actor.id,
        actorName: actor.name,
        action: "SETTING_UPDATED",
        category: definition.category,
        settingKey: key,
        before: beforeValStr,
        after: afterValStr,
        impactSummary: `Updated ${definition.name} (${key})`,
        risk: definition.sensitivity,
      },
    });
  });

  return { ok: true, version: newVersionNumber };
}

/**
 * Safe Rollback to a specific target version.
 * Creates a new version snapshot restoring the prior value.
 */
export async function rollbackSetting(
  workspaceId: string,
  key: string,
  targetVersion: number,
  actor: { id: string; name: string }
): Promise<{ ok: boolean; newVersion: number; error?: string }> {
  const versionRecord = await db.configurationVersion.findFirst({
    where: {
      workspaceId,
      settingKey: key,
      version: targetVersion,
    },
  });

  if (!versionRecord) {
    return { ok: false, newVersion: 0, error: `Version ${targetVersion} not found for ${key}.` };
  }

  const definition = CONFIGURATION_REGISTRY[key];
  if (!definition) {
    return { ok: false, newVersion: 0, error: `Setting ${key} not in registry.` };
  }

  const currentSetting = await db.workspaceControlSetting.findUnique({
    where: { workspaceId_key: { workspaceId, key } },
  });

  const nextVersion = (currentSetting?.version || 1) + 1;
  const restoredValue = versionRecord.afterValue;

  await db.$transaction(async (tx) => {
    await tx.workspaceControlSetting.update({
      where: { workspaceId_key: { workspaceId, key } },
      data: {
        value: restoredValue,
        version: nextVersion,
        updatedById: actor.id,
        updatedByName: actor.name,
        updatedAt: new Date(),
      },
    });

    await tx.configurationVersion.create({
      data: {
        workspaceId,
        settingKey: key,
        version: nextVersion,
        beforeValue: currentSetting?.value || null,
        afterValue: restoredValue,
        reason: `Rollback to version ${targetVersion}`,
        changedById: actor.id,
        changedByName: actor.name,
      },
    });

    await tx.configurationAuditEvent.create({
      data: {
        workspaceId,
        actorId: actor.id,
        actorName: actor.name,
        action: "SETTING_ROLLBACK",
        category: definition.category,
        settingKey: key,
        before: currentSetting?.value || null,
        after: restoredValue,
        impactSummary: `Restored ${definition.name} to v${targetVersion}`,
        risk: definition.sensitivity,
      },
    });
  });

  return { ok: true, newVersion: nextVersion };
}

/**
 * Returns configuration version history for a setting
 */
export async function getConfigurationHistory(
  workspaceId: string,
  key: string
) {
  return db.configurationVersion.findMany({
    where: { workspaceId, settingKey: key },
    orderBy: { version: "desc" },
    take: 20,
  });
}
