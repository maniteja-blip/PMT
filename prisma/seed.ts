import { faker } from "@faker-js/faker";
import {
  ActivityAction,
  EntityType,
  HealthStatus,
  MilestoneStatus,
  PrismaClient,
  ProjectStatus,
  Role,
  TaskPriority,
  TaskStatus,
  ViewKind,
} from "@prisma/client";
import bcrypt from "bcryptjs";

faker.seed(42);

const db = new PrismaClient();

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function daysFromNow(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

async function main() {
  await db.activityEvent.deleteMany();
  await db.comment.deleteMany();
  await db.taskDependency.deleteMany();
  await db.task.deleteMany();
  await db.milestone.deleteMany();
  await db.project.deleteMany();
  await db.user.deleteMany();
  await db.team.deleteMany();

  // By default, seed ONLY a minimal bootstrap (no mock data).
  // Set SEED_MODE=demo to generate rich demo data.
  const seedMode = (process.env.SEED_MODE ?? "minimal").toLowerCase();
  const seedPassword = process.env.SEED_PASSWORD ?? "pmt";
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const coreTeam = await db.team.create({ data: { name: "Core" } });
  const adminUser = await db.user.create({
    data: {
      name: process.env.SEED_ADMIN_NAME ?? "Admin",
      email: (process.env.SEED_ADMIN_EMAIL ?? "admin@pmt.local").toLowerCase(),
      role: Role.ADMIN,
      teamId: coreTeam.id,
      timezone: "America/New_York",
      weeklyCapacityHours: 40,
      passwordHash,
    },
  });

  // Create a fixed Member user for E2E testing
  await db.user.create({
    data: {
      name: "Test Member",
      email: "member@pmt.local",
      role: Role.MEMBER,
      teamId: coreTeam.id,
      passwordHash,
    },
  });

  if (seedMode !== "demo") {
    // Minimal bootstrap only.
    await db.savedView.deleteMany({ where: { ownerId: adminUser.id } });
    await db.invite.deleteMany();
    return;
  }

  // ---- DEMO SEED BELOW (opt-in) ----

  const teams = [coreTeam, ...(await Promise.all(["Foundry", "Field Ops", "Studio", "Signal"].map((name) => db.team.create({ data: { name } }))))];

  const users = [adminUser];
  const more = await Promise.all(
    Array.from({ length: 11 }).map(async (_, i) => {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const role = i <= 1 ? Role.MANAGER : Role.MEMBER;

      return db.user.create({
        data: {
          name: `${first} ${last}`,
          email: faker.internet.email({ firstName: first, lastName: last }).toLowerCase(),
          passwordHash,
          role,
          teamId: pick(teams).id,
          timezone: pick([
            "America/New_York",
            "America/Los_Angeles",
            "Europe/London",
            "Asia/Singapore",
          ]),
          weeklyCapacityHours: clamp(
            Math.round(faker.number.float({ min: 24, max: 42 })),
            20,
            50,
          ),
          avatarUrl: faker.image.avatarGitHub(),
        },
      });
    }),
  );
  users.push(...more);

  // A couple of demo saved views.
  const admin = users[0]!;
  await db.savedView.createMany({
    data: [
      {
        ownerId: admin.id,
        kind: ViewKind.TASKS,
        name: "Due this week",
        query: { due: "7d" },
      },
      {
        ownerId: admin.id,
        kind: ViewKind.TASKS,
        name: "Blocked",
        query: { status: "BLOCKED" },
      },
      {
        ownerId: admin.id,
        kind: ViewKind.PROJECTS,
        name: "At risk",
        query: { health: "AT_RISK" },
      },
      {
        ownerId: admin.id,
        kind: ViewKind.PEOPLE,
        name: "Overloaded",
        query: { overloaded: true },
      },
    ],
  });

  const projectNames = [
    "Atlas Delivery Engine",
    "Pulse Status Board",
    "Drift Risk Radar",
    "Quarry Knowledge Base",
    "Aster Ops Console",
    "Lumen Client Portal",
    "Sable Dependencies",
    "Harbor Reporting Suite",
  ];

  const projects = await Promise.all(
    projectNames.slice(0, 7).map((name, i) => {
      const owner = users[i % users.length]!;
      const start = daysAgo(45 - i * 4);
      const target = daysFromNow(30 + i * 8);
      const health = pick([HealthStatus.ON_TRACK, HealthStatus.ON_TRACK, HealthStatus.AT_RISK]);

      return db.project.create({
        data: {
          name,
          description: faker.lorem.sentences({ min: 1, max: 2 }),
          ownerId: owner.id,
          status: pick([ProjectStatus.ACTIVE, ProjectStatus.ACTIVE, ProjectStatus.ACTIVE, ProjectStatus.PAUSED]),
          health,
          startDate: start,
          targetDate: target,
        },
      });
    }),
  );

  for (const project of projects) {
    await Promise.all(
      Array.from({ length: 2 }).map((_, idx) =>
        db.milestone.create({
          data: {
            projectId: project.id,
            name: idx === 0 ? "Milestone Alpha" : "Milestone Beta",
            dueDate: idx === 0 ? daysFromNow(12) : daysFromNow(32),
            status: idx === 0 ? MilestoneStatus.IN_PROGRESS : MilestoneStatus.PLANNED,
          },
        }),
      ),
    );
  }

  const statuses: TaskStatus[] = [
    TaskStatus.BACKLOG,
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.BLOCKED,
    TaskStatus.DONE,
  ];
  const priorities: TaskPriority[] = [
    TaskPriority.LOW,
    TaskPriority.MEDIUM,
    TaskPriority.HIGH,
    TaskPriority.URGENT,
  ];

  const allTasks: { id: string; projectId: string; assigneeId: string | null }[] = [];

  for (const project of projects) {
    const tasks = await Promise.all(
      Array.from({ length: 38 }).map(() => {
        const status = pick(statuses);
        const priority = pick(priorities);
        const assignee = Math.random() < 0.92 ? pick(users) : null;
        const reporter = pick(users);
        const estimateHours = Math.round(faker.number.float({ min: 1, max: 16 }) * 2) / 2;

        const createdAt = daysAgo(faker.number.int({ min: 2, max: 50 }));
        const startedAt = status === TaskStatus.IN_PROGRESS || status === TaskStatus.BLOCKED || status === TaskStatus.DONE
          ? new Date(createdAt.getTime() + faker.number.int({ min: 1, max: 6 }) * 24 * 60 * 60 * 1000)
          : null;
        const completedAt = status === TaskStatus.DONE && startedAt
          ? new Date(startedAt.getTime() + faker.number.int({ min: 1, max: 12 }) * 24 * 60 * 60 * 1000)
          : null;

        const dueDate =
          status === TaskStatus.DONE
            ? daysAgo(faker.number.int({ min: 0, max: 12 }))
            : pick([daysFromNow(faker.number.int({ min: 1, max: 28 })), daysAgo(faker.number.int({ min: 1, max: 8 }))]);

        return db.task.create({
          data: {
            projectId: project.id,
            title: faker.hacker.phrase().replace(/\.$/, ""),
            description: faker.lorem.sentences({ min: 1, max: 3 }),
            status,
            priority,
            estimateHours,
            dueDate,
            assigneeId: assignee?.id ?? null,
            reporterId: reporter.id,
            createdAt,
            startedAt,
            completedAt,
          },
          select: { id: true, projectId: true, assigneeId: true },
        });
      }),
    );

    allTasks.push(...tasks);

    // Create a small web of dependencies inside each project.
    const projectTasks = tasks;
    for (let i = 0; i < 14; i++) {
      const from = pick(projectTasks);
      const to = pick(projectTasks);
      if (from.id === to.id) continue;
      await db.taskDependency
        .create({ data: { fromTaskId: from.id, toTaskId: to.id } })
        .catch(() => undefined);
    }
  }

  // Comments + activity events (this powers the "expensive" feel).
  for (const task of allTasks) {
    const actor = task.assigneeId ? users.find((u) => u.id === task.assigneeId) ?? pick(users) : pick(users);
    const commenters = [actor, pick(users), pick(users)].filter(Boolean);

    if (Math.random() < 0.62) {
      await db.comment.create({
        data: {
          taskId: task.id,
          authorId: pick(commenters).id,
          body: faker.lorem.sentences({ min: 1, max: 2 }),
          createdAt: daysAgo(faker.number.int({ min: 0, max: 18 })),
        },
      });

      await db.activityEvent.create({
        data: {
          actorId: pick(commenters).id,
          entityType: EntityType.COMMENT,
          entityId: task.id,
          action: ActivityAction.COMMENTED,
          metadata: { kind: "task", taskId: task.id },
          createdAt: daysAgo(faker.number.int({ min: 0, max: 18 })),
        },
      });
    }

    await db.activityEvent.createMany({
      data: [
        {
          actorId: actor.id,
          entityType: EntityType.TASK,
          entityId: task.id,
          action: ActivityAction.CREATED,
          metadata: { hint: "Seeded" },
          createdAt: daysAgo(faker.number.int({ min: 12, max: 42 })),
        },
        {
          actorId: actor.id,
          entityType: EntityType.TASK,
          entityId: task.id,
          action: ActivityAction.ASSIGNED,
          metadata: { assigneeId: task.assigneeId },
          createdAt: daysAgo(faker.number.int({ min: 6, max: 24 })),
        },
        {
          actorId: actor.id,
          entityType: EntityType.TASK,
          entityId: task.id,
          action: ActivityAction.STATUS_CHANGED,
          metadata: { from: "TODO", to: "IN_PROGRESS" },
          createdAt: daysAgo(faker.number.int({ min: 1, max: 12 })),
        },
      ],
    });
  }
}

main()
  .then(() => {
    console.log("Seed complete");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
