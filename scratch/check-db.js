const { PrismaClient } = require('./src/generated/prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function check() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } });
  const employees = await prisma.employee.findMany({
    select: { id: true, fullName: true, email: true, department: true, role: { select: { name: true } } }
  });
  const projects = await prisma.clientProject.findMany({
    select: { id: true, name: true, code: true }
  });
  const tasks = await prisma.clientTask.findMany({
    select: { id: true, code: true, title: true, layer: true, assigneeId: true, assigneeName: true, status: true }
  });
  const convos = await prisma.workConversation.count();
  const msgs = await prisma.workMessage.count();
  const builds = await prisma.productBuild.count();
  const submissions = await prisma.buildSubmission.count();

  console.log(JSON.stringify({ users, employees, projects, tasks, convos, msgs, builds, submissions }, null, 2));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
