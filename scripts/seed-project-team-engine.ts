import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function seedProjectTeamEngine() {
  console.log("=== SEEDING REAL PROJECT-FIRST TEAM & COMMUNICATION ENGINE ===");

  // 1. Get Project A (CRM)
  const projectA = await db.clientProject.findFirst({
    where: { name: { contains: "CRM" } },
    include: { client: true },
  });

  if (!projectA) {
    throw new Error("Project A (CRM) not found in database.");
  }

  const workspaceId = projectA.client.workspaceId;
  const clientId = projectA.clientId;

  console.log(`Found Project A: "${projectA.name}" (ID: ${projectA.id})`);

  // 2. Ensure Project B (E-Commerce Platform) exists
  let projectB = await db.clientProject.findFirst({
    where: { code: "PRJ-2026-002" },
  });

  if (!projectB) {
    projectB = await db.clientProject.create({
      data: {
        clientId,
        name: "E-Commerce Platform & Order Management",
        code: "PRJ-2026-002",
        description: "High-throughput omni-channel e-commerce checkout, catalog, and inventory sync platform.",
        stage: "PLANNING",
        health: "ON_TRACK",
        progress: 15,
      },
    });
    console.log(`Created Project B: "${projectB.name}" (ID: ${projectB.id})`);
  } else {
    console.log(`Found Project B: "${projectB.name}" (ID: ${projectB.id})`);
  }

  const defaultPasswordHash = await bcrypt.hash("password123", 10);

  // 3. Define Real Personnel for Project A & Project B
  const staffSpecs = [
    {
      fullName: "John",
      email: "john.developer@businessos.internal",
      department: "ENGINEERING",
      projectA: { teamName: "FRONTEND", role: "Frontend Developer" },
      projectB: { teamName: "BACKEND", role: "Backend Developer" },
    },
    {
      fullName: "Priya",
      email: "priya.dev@businessos.internal",
      department: "ENGINEERING",
      projectA: { teamName: "FRONTEND", role: "Frontend Developer" },
    },
    {
      fullName: "Rahul",
      email: "rahul.ui@businessos.internal",
      department: "DESIGN",
      projectA: { teamName: "FRONTEND", role: "UI Engineer" },
    },
    {
      fullName: "Karthik",
      email: "karthik.api@businessos.internal",
      department: "ENGINEERING",
      projectA: { teamName: "BACKEND", role: "Lead Backend Engineer" },
    },
    {
      fullName: "Vikram",
      email: "vikram.backend@businessos.internal",
      department: "ENGINEERING",
      projectA: { teamName: "BACKEND", role: "Backend Developer" },
    },
    {
      fullName: "Ananya",
      email: "ananya.data@businessos.internal",
      department: "ENGINEERING",
      projectA: { teamName: "DATABASE", role: "Database Architect" },
    },
    {
      fullName: "Siddharth",
      email: "siddharth.qa@businessos.internal",
      department: "QA",
      projectA: { teamName: "QA", role: "QA Lead" },
    },
    {
      fullName: "Sneha",
      email: "sneha.qa@businessos.internal",
      department: "QA",
      projectA: { teamName: "QA", role: "Automation Test Engineer" },
    },
    // Project B Independent Team
    {
      fullName: "Arjun",
      email: "arjun.fe@businessos.internal",
      department: "ENGINEERING",
      projectB: { teamName: "FRONTEND", role: "Lead Frontend Engineer" },
    },
    {
      fullName: "Meera",
      email: "meera.fe@businessos.internal",
      department: "ENGINEERING",
      projectB: { teamName: "FRONTEND", role: "Frontend Developer" },
    },
    {
      fullName: "Rohan",
      email: "rohan.be@businessos.internal",
      department: "ENGINEERING",
      projectB: { teamName: "BACKEND", role: "Distributed Systems Engineer" },
    },
    {
      fullName: "Divya",
      email: "divya.db@businessos.internal",
      department: "ENGINEERING",
      projectB: { teamName: "DATABASE", role: "Database Engineer" },
    },
    {
      fullName: "Amit",
      email: "amit.qa@businessos.internal",
      department: "QA",
      projectB: { teamName: "QA", role: "Quality Assurance Specialist" },
    },
  ];

  const employeeMap = new Map<string, any>();

  for (const spec of staffSpecs) {
    // 1. Ensure User exists
    let user = await db.user.findUnique({ where: { email: spec.email } });
    if (!user) {
      user = await db.user.create({
        data: {
          email: spec.email,
          name: spec.fullName,
          companyName: "Business OS",
          passwordHash: defaultPasswordHash,
          role: "MEMBER",
          status: "ACTIVE",
          emailVerified: new Date(),
        },
      });
    }

    // 2. Ensure Employee exists
    let emp = await db.employee.findFirst({ where: { email: spec.email } });
    if (!emp) {
      emp = await db.employee.create({
        data: {
          workspaceId,
          userId: user.id,
          employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          fullName: spec.fullName,
          email: spec.email,
          status: "ACTIVE",
          department: spec.department,
          primaryResponsibility: spec.projectA?.role || spec.projectB?.role || "Engineering Delivery",
        },
      });
    } else if (!emp.userId) {
      emp = await db.employee.update({
        where: { id: emp.id },
        data: { userId: user.id, status: "ACTIVE" },
      });
    }

    employeeMap.set(spec.fullName, emp);

    // 3. Create Project A Membership
    if (spec.projectA) {
      const existingAllocA = await db.projectStaffAllocation.findFirst({
        where: { projectId: projectA.id, employeeId: emp.id },
      });

      if (existingAllocA) {
        await db.projectStaffAllocation.update({
          where: { id: existingAllocA.id },
          data: {
            teamName: spec.projectA.teamName,
            projectRole: spec.projectA.role,
            status: "ACTIVE",
            releasedAt: null,
          },
        });
      } else {
        await db.projectStaffAllocation.create({
          data: {
            projectId: projectA.id,
            employeeId: emp.id,
            teamName: spec.projectA.teamName,
            projectRole: spec.projectA.role,
            status: "ACTIVE",
            allocationPercentage: 100,
            workstream: spec.projectA.teamName,
          },
        });
      }
    }

    // 4. Create Project B Membership
    if (spec.projectB) {
      const existingAllocB = await db.projectStaffAllocation.findFirst({
        where: { projectId: projectB.id, employeeId: emp.id },
      });

      if (existingAllocB) {
        await db.projectStaffAllocation.update({
          where: { id: existingAllocB.id },
          data: {
            teamName: spec.projectB.teamName,
            projectRole: spec.projectB.role,
            status: "ACTIVE",
            releasedAt: null,
          },
        });
      } else {
        await db.projectStaffAllocation.create({
          data: {
            projectId: projectB.id,
            employeeId: emp.id,
            teamName: spec.projectB.teamName,
            projectRole: spec.projectB.role,
            status: "ACTIVE",
            allocationPercentage: 100,
            workstream: spec.projectB.teamName,
          },
        });
      }
    }
  }

  // Also ensure Chera is allocated to Project A Frontend and Project B Backend/Architecture
  const cheraEmp = await db.employee.findFirst({
    where: {
      OR: [
        { email: "cheralathanbncse2427@ksrce.ac.in" },
        { email: "cheralathannandha9098@gmail.com" },
      ],
    },
  });

  if (cheraEmp) {
    employeeMap.set("Chera", cheraEmp);

    // Alloc A
    const allocA = await db.projectStaffAllocation.findFirst({
      where: { projectId: projectA.id, employeeId: cheraEmp.id },
    });
    if (allocA) {
      await db.projectStaffAllocation.update({
        where: { id: allocA.id },
        data: { teamName: "FRONTEND", projectRole: "Frontend Lead", status: "ACTIVE" },
      });
    }

    // Alloc B
    const allocB = await db.projectStaffAllocation.findFirst({
      where: { projectId: projectB.id, employeeId: cheraEmp.id },
    });
    if (allocB) {
      await db.projectStaffAllocation.update({
        where: { id: allocB.id },
        data: { teamName: "BACKEND", projectRole: "Solutions Architect", status: "ACTIVE" },
      });
    } else {
      await db.projectStaffAllocation.create({
        data: {
          projectId: projectB.id,
          employeeId: cheraEmp.id,
          teamName: "BACKEND",
          projectRole: "Solutions Architect",
          status: "ACTIVE",
          allocationPercentage: 100,
          workstream: "BACKEND",
        },
      });
    }
  }

  console.log("Employees & Project Memberships seeded successfully!");

  // 5. Assign Tasks to Match Section 5 Workloads Exactly:
  // John (Frontend): 8 assigned, 3 completed, 2 in progress, 1 waiting, 2 review -> Status: Working
  // Priya (Frontend): 5 assigned, 2 completed, 3 todo -> Status: Available
  // Rahul (Frontend): 4 assigned, 1 review, 3 todo -> Status: In Review
  // Karthik (Backend): 6 assigned, 3 completed, 3 in progress
  // Vikram (Backend): 4 assigned, 2 completed, 2 todo
  // Ananya (Database): 5 assigned, 2 completed, 2 in progress, 1 review
  // Siddharth & Sneha (QA): 7 assigned verification tests

  const johnEmp = employeeMap.get("John");
  const priyaEmp = employeeMap.get("Priya");
  const rahulEmp = employeeMap.get("Rahul");
  const karthikEmp = employeeMap.get("Karthik");
  const vikramEmp = employeeMap.get("Vikram");
  const ananyaEmp = employeeMap.get("Ananya");
  const siddharthEmp = employeeMap.get("Siddharth");
  const snehaEmp = employeeMap.get("Sneha");

  const existingTasksA = await db.clientTask.findMany({
    where: { projectId: projectA.id },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Assigning workloads on ${existingTasksA.length} tasks in Project A...`);

  let idx = 0;
  // John: 8 tasks (3 completed, 2 in progress, 1 review, 2 todo)
  if (johnEmp && existingTasksA.length >= 8) {
    const statuses: any[] = ["COMPLETED", "COMPLETED", "COMPLETED", "IN_PROGRESS", "IN_PROGRESS", "IN_REVIEW", "TODO", "TODO"];
    for (let i = 0; i < 8; i++) {
      await db.clientTask.update({
        where: { id: existingTasksA[idx].id },
        data: {
          assigneeId: johnEmp.id,
          assigneeName: johnEmp.fullName,
          status: statuses[i],
          workstream: "FRONTEND",
          layer: "FRONTEND",
        },
      });
      idx++;
    }
  }

  // Priya: 5 tasks (2 completed, 3 todo)
  if (priyaEmp && existingTasksA.length >= idx + 5) {
    const statuses: any[] = ["COMPLETED", "COMPLETED", "TODO", "TODO", "TODO"];
    for (let i = 0; i < 5; i++) {
      await db.clientTask.update({
        where: { id: existingTasksA[idx].id },
        data: {
          assigneeId: priyaEmp.id,
          assigneeName: priyaEmp.fullName,
          status: statuses[i],
          workstream: "FRONTEND",
          layer: "FRONTEND",
        },
      });
      idx++;
    }
  }

  // Rahul: 4 tasks (1 review, 3 todo)
  if (rahulEmp && existingTasksA.length >= idx + 4) {
    const statuses: any[] = ["IN_REVIEW", "TODO", "TODO", "TODO"];
    for (let i = 0; i < 4; i++) {
      await db.clientTask.update({
        where: { id: existingTasksA[idx].id },
        data: {
          assigneeId: rahulEmp.id,
          assigneeName: rahulEmp.fullName,
          status: statuses[i],
          workstream: "FRONTEND",
          layer: "FRONTEND",
        },
      });
      idx++;
    }
  }

  // Karthik: 6 backend tasks (3 completed, 3 in progress)
  if (karthikEmp && existingTasksA.length >= idx + 6) {
    const statuses: any[] = ["COMPLETED", "COMPLETED", "COMPLETED", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS"];
    for (let i = 0; i < 6; i++) {
      await db.clientTask.update({
        where: { id: existingTasksA[idx].id },
        data: {
          assigneeId: karthikEmp.id,
          assigneeName: karthikEmp.fullName,
          status: statuses[i],
          workstream: "BACKEND",
          layer: "BACKEND",
        },
      });
      idx++;
    }
  }

  // Vikram: 4 backend tasks (2 completed, 2 todo)
  if (vikramEmp && existingTasksA.length >= idx + 4) {
    const statuses: any[] = ["COMPLETED", "COMPLETED", "TODO", "TODO"];
    for (let i = 0; i < 4; i++) {
      await db.clientTask.update({
        where: { id: existingTasksA[idx].id },
        data: {
          assigneeId: vikramEmp.id,
          assigneeName: vikramEmp.fullName,
          status: statuses[i],
          workstream: "BACKEND",
          layer: "BACKEND",
        },
      });
      idx++;
    }
  }

  // Ananya: 4 database tasks (2 completed, 2 in progress)
  if (ananyaEmp && existingTasksA.length >= idx + 4) {
    const statuses: any[] = ["COMPLETED", "COMPLETED", "IN_PROGRESS", "IN_PROGRESS"];
    for (let i = 0; i < 4; i++) {
      await db.clientTask.update({
        where: { id: existingTasksA[idx].id },
        data: {
          assigneeId: ananyaEmp.id,
          assigneeName: ananyaEmp.fullName,
          status: statuses[i],
          workstream: "DATABASE",
          layer: "DATABASE",
        },
      });
      idx++;
    }
  }

  // QA Tasks: Siddharth & Sneha (6 tasks)
  if (siddharthEmp && snehaEmp && existingTasksA.length >= idx + 6) {
    for (let i = 0; i < 3; i++) {
      await db.clientTask.update({
        where: { id: existingTasksA[idx].id },
        data: {
          assigneeId: siddharthEmp.id,
          assigneeName: siddharthEmp.fullName,
          status: i === 0 ? "IN_PROGRESS" : "TODO",
          workstream: "QA",
          layer: "QA",
        },
      });
      idx++;
    }
    for (let i = 0; i < 3; i++) {
      await db.clientTask.update({
        where: { id: existingTasksA[idx].id },
        data: {
          assigneeId: snehaEmp.id,
          assigneeName: snehaEmp.fullName,
          status: i === 0 ? "COMPLETED" : "TODO",
          workstream: "QA",
          layer: "QA",
        },
      });
      idx++;
    }
  }

  // 6. Create Tasks for Project B (E-Commerce Platform)
  const existingTasksB = await db.clientTask.findMany({
    where: { projectId: projectB.id },
  });

  if (existingTasksB.length === 0) {
    console.log("Creating independent tasks for Project B (E-Commerce Platform)...");
    const ecomTasks = [
      { code: "ECOM-BE-01", title: "Implement Checkout Stripe payment intent API", layer: "BACKEND", workstream: "BACKEND", assignee: johnEmp, status: "IN_PROGRESS" },
      { code: "ECOM-BE-02", title: "Build Inventory reservation and stock sync worker", layer: "BACKEND", workstream: "BACKEND", assignee: johnEmp, status: "TODO" },
      { code: "ECOM-FE-01", title: "Design product catalog gallery and filter facets", layer: "FRONTEND", workstream: "FRONTEND", status: "IN_PROGRESS" },
      { code: "ECOM-FE-02", title: "Implement shopping cart drawer and line items", layer: "FRONTEND", workstream: "FRONTEND", status: "TODO" },
      { code: "ECOM-DB-01", title: "Design product SKU and order items PostgreSQL schema", layer: "DATABASE", workstream: "DATABASE", status: "COMPLETED" },
      { code: "ECOM-QA-01", title: "E2E checkout flow and coupon discount tests", layer: "QA", workstream: "QA", status: "TODO" },
    ];

    for (const t of ecomTasks) {
      await db.clientTask.create({
        data: {
          projectId: projectB.id,
          clientId: projectB.clientId,
          code: t.code,
          title: t.title,
          layer: t.layer,
          workstream: t.workstream,
          status: t.status as any,
          assigneeId: t.assignee?.id || null,
          assigneeName: t.assignee?.fullName || null,
        },
      });
    }
  }

  // 7. Seed Real Project Conversations for Project A (Section 8, 9, 10, 11, 12)
  console.log("Seeding Project-Aware Conversations in Project A...");

  // A. Direct Message: John (Frontend) ↔ Rahul (Backend)
  if (johnEmp && karthikEmp) {
    let directConv = await db.workConversation.findFirst({
      where: {
        projectId: projectA.id,
        type: "DIRECT",
        title: "John ↔ Karthik (Backend)",
      },
    });

    if (!directConv) {
      directConv = await db.workConversation.create({
        data: {
          workspaceId,
          projectId: projectA.id,
          type: "DIRECT",
          title: "John ↔ Karthik (Backend)",
          workstream: "FRONTEND",
          targetWorkstream: "BACKEND",
          participants: {
            create: [
              { employeeId: johnEmp.id, userId: johnEmp.userId },
              { employeeId: karthikEmp.id, userId: karthikEmp.userId },
            ],
          },
          messages: {
            create: [
              {
                senderEmployeeId: johnEmp.id,
                senderUserId: johnEmp.userId,
                senderName: "John",
                senderRole: "Frontend Developer",
                senderTeam: "FRONTEND",
                content: "Hi Karthik, is the Product Listing API endpoint ready for frontend integration?",
                messageType: "QUESTION",
                metadata: JSON.stringify({ projectId: projectA.id, dependencyLabel: "Product API" }),
              },
              {
                senderEmployeeId: karthikEmp.id,
                senderUserId: karthikEmp.userId,
                senderName: "Karthik",
                senderRole: "Lead Backend Engineer",
                senderTeam: "BACKEND",
                content: "Yes John! Product API is deployed on staging with full pagination and filter support.",
                messageType: "UPDATE",
                metadata: JSON.stringify({ projectId: projectA.id, dependencyLabel: "Product API" }),
              },
            ],
          },
        },
      });
    }
  }

  // B. Team Group Message: Frontend Team
  if (johnEmp && priyaEmp && rahulEmp) {
    let teamConv = await db.workConversation.findFirst({
      where: {
        projectId: projectA.id,
        type: "TEAM",
        title: "Frontend Team",
      },
    });

    if (!teamConv) {
      teamConv = await db.workConversation.create({
        data: {
          workspaceId,
          projectId: projectA.id,
          type: "TEAM",
          title: "Frontend Team",
          workstream: "FRONTEND",
          participants: {
            create: [
              { employeeId: johnEmp.id, userId: johnEmp.userId },
              { employeeId: priyaEmp.id, userId: priyaEmp.userId },
              { employeeId: rahulEmp.id, userId: rahulEmp.userId },
            ],
          },
          messages: {
            create: [
              {
                senderEmployeeId: johnEmp.id,
                senderUserId: johnEmp.userId,
                senderName: "John",
                senderRole: "Frontend Developer",
                senderTeam: "FRONTEND",
                content: "Dashboard API integration is ready for review.",
                messageType: "UPDATE",
                metadata: JSON.stringify({ projectId: projectA.id, workstream: "FRONTEND" }),
              },
            ],
          },
        },
      });
    }
  }

  // C. Cross-Team Message: Frontend ↔ Backend
  if (johnEmp && priyaEmp && karthikEmp && vikramEmp) {
    let crossConv = await db.workConversation.findFirst({
      where: {
        projectId: projectA.id,
        type: "CROSS-TEAM",
        title: "Frontend ↔ Backend Sync",
      },
    });

    if (!crossConv) {
      crossConv = await db.workConversation.create({
        data: {
          workspaceId,
          projectId: projectA.id,
          type: "CROSS-TEAM",
          title: "Frontend ↔ Backend Sync",
          workstream: "FRONTEND",
          targetWorkstream: "BACKEND",
          participants: {
            create: [
              { employeeId: johnEmp.id, userId: johnEmp.userId },
              { employeeId: priyaEmp.id, userId: priyaEmp.userId },
              { employeeId: karthikEmp.id, userId: karthikEmp.userId },
              { employeeId: vikramEmp.id, userId: vikramEmp.userId },
            ],
          },
          messages: {
            create: [
              {
                senderEmployeeId: johnEmp.id,
                senderUserId: johnEmp.userId,
                senderName: "John",
                senderRole: "Frontend Developer",
                senderTeam: "FRONTEND",
                content: "Coordinating with backend on JWT refresh token flow for customer auth.",
                messageType: "TEXT",
                metadata: JSON.stringify({ projectId: projectA.id, targetTeams: ["FRONTEND", "BACKEND"] }),
              },
            ],
          },
        },
      });
    }
  }

  // D. Admin Broadcast: Entire Project
  let adminConv = await db.workConversation.findFirst({
    where: {
      projectId: projectA.id,
      type: "ADMIN",
      title: "Admin Announcement · All Project Teams",
    },
  });

  if (!adminConv) {
    adminConv = await db.workConversation.create({
      data: {
        workspaceId,
        projectId: projectA.id,
        type: "ADMIN",
        title: "Admin Announcement · All Project Teams",
        workstream: "ALL",
        messages: {
          create: [
            {
              senderName: "Project Administrator",
              senderRole: "Project Owner",
              senderTeam: "ADMIN",
              content: "Milestone 1 sprint review scheduled for Friday. Please ensure all deliverable proofs are uploaded.",
              messageType: "SYSTEM",
              metadata: JSON.stringify({ projectId: projectA.id, broadcastScope: "ENTIRE_PROJECT" }),
            },
          ],
        },
      },
    });
  }

  console.log("=== SEEDING COMPLETED SUCCESSFULLY! ===");
}

seedProjectTeamEngine()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding error:", err);
    process.exit(1);
  });
