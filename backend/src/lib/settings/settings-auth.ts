import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export interface SettingsAuthContext {
  userId: string;
  userName: string;
  userEmail: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  workspace: {
    id: string;
    companyName: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export async function getSettingsAuthContext(): Promise<SettingsAuthContext | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  // Try finding workspace owned by user, or fallback to first available workspace
  let workspace = await db.workspace.findUnique({
    where: { ownerId: session.user.id },
  });

  if (!workspace) {
    workspace = await db.workspace.findFirst();
  }

  if (!workspace) {
    return null;
  }

  const isOwner = workspace.ownerId === session.user.id;
  const rawRole = (session.user as any).role || (isOwner ? "OWNER" : "ADMIN");
  const role: "OWNER" | "ADMIN" | "MEMBER" = isOwner
    ? "OWNER"
    : rawRole === "OWNER" || rawRole === "ADMIN"
    ? rawRole
    : "MEMBER";

  return {
    userId: session.user.id,
    userName: session.user.name || "Admin",
    userEmail: session.user.email || "admin@workspace.local",
    role,
    workspace,
  };
}
