import { db } from "../src/lib/db";

async function main() {
  const emps = await db.employee.findMany({
    select: { id: true, fullName: true, email: true, userId: true, role: { select: { name: true } } }
  });
  console.log("EMPLOYEES:", JSON.stringify(emps, null, 2));

  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true }
  });
  console.log("USERS:", JSON.stringify(users, null, 2));

  const workspaces = await db.workspace.findMany({
    select: { id: true, companyName: true, ownerId: true }
  });
  console.log("WORKSPACES:", JSON.stringify(workspaces, null, 2));

  const convs = await db.workConversation.findMany({
    include: {
      participants: {
        include: { employee: { select: { id: true, fullName: true } }, user: { select: { id: true, name: true } } }
      },
      messages: { select: { id: true, senderName: true, content: true } }
    }
  });
  console.log("CONVERSATIONS:", JSON.stringify(convs, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
