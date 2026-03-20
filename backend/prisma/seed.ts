/// <reference types="node" />
import bcrypt from 'bcrypt';
import prisma from '../src/utils/prisma';

type SeedUser = {
  email: string;
  name: string;
  globalRole: 'GLOBAL_ADMIN' | 'USER';
};

type ProjectBlueprint = {
  name: string;
  description: string;
};

type BoardTaskSummary = {
  id: string;
  reporterId: string;
  createdAt: Date;
};

const PASSWORD = '111';
const TARGET_TASK_COUNT = 245;

const projectRoleCycle = [
  'PROJECT_ADMIN',
  'PROJECT_MEMBER',
  'PROJECT_VIEWER',
] as const;

const projectBlueprints: ProjectBlueprint[] = [
  {
    name: 'Latveria Contingency Protocol',
    description:
      'Coordinate counter-intelligence and logistics to contain Doom-level escalation risks.',
  },
  {
    name: 'Baxter Recovery Initiative',
    description:
      'Secure high-risk research assets and rebuild chain-of-custody reliability.',
  },
  {
    name: 'Kang Signal Intercept',
    description:
      'Track temporal anomalies and stabilize multiverse-adjacent telemetry channels.',
  },
  {
    name: 'Vibranium Shield Grid',
    description:
      'Expand defensive mesh coverage over vulnerable metropolitan corridors.',
  },
  {
    name: 'Sokovia Archive Reconstruction',
    description:
      'Reassemble fragmented incident records for legal, diplomatic, and strategic review.',
  },
  {
    name: 'Sanctum Ward Reinforcement',
    description:
      'Harden magical containment boundaries against coordinated breach attempts.',
  },
  {
    name: 'Stark Orbital Readiness',
    description:
      'Recalibrate orbital response assets for rapid global threat redeployment.',
  },
  {
    name: 'Midtown Evacuation Matrix',
    description:
      'Tune civilian safety routing and emergency comms under urban combat constraints.',
  },
];

const boardNames = ['War Room', 'Field Ops', 'Debrief'];

const commentSnippets = [
  'Cross-checked this against Stark satellite feeds; one outlier remains in the east corridor.',
  'I pushed a narrow mitigation first so Strange can validate timeline side effects.',
  'Before rollout, can we lock evac priority rules for noncombat districts?',
  'Replayed the incident with degraded comms and got a mismatch near the Latverian relay.',
  'Stable in local simulations, but we still need a full pass on higher threat volumes.',
  'I can own the handoff once Fury confirms field-team readiness.',
];

async function main(): Promise<void> {
  const commonPassword = await bcrypt.hash(PASSWORD, 10);

  // Start from a clean collaboration graph while preserving existing user accounts.
  await prisma.auditLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.task.deleteMany();
  await prisma.column.deleteMany();
  await prisma.board.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();

  const usersToSeed: SeedUser[] = [
    {
      email: 'nick.fury@avengershq.org',
      name: 'Nick Fury',
      globalRole: 'GLOBAL_ADMIN',
    },
    {
      email: 'victor.doom@latveria.gov',
      name: 'Victor Von Doom',
      globalRole: 'GLOBAL_ADMIN',
    },
    {
      email: 'sam.wilson@avengershq.org',
      name: 'Sam Wilson',
      globalRole: 'USER',
    },
    {
      email: 'bucky.barnes@avengershq.org',
      name: 'Bucky Barnes',
      globalRole: 'USER',
    },
    {
      email: 'carol.danvers@avengershq.org',
      name: 'Carol Danvers',
      globalRole: 'USER',
    },
    { email: 'shuri@wakanda.gov', name: 'Shuri', globalRole: 'USER' },
    {
      email: 'peter.parker@midtown.edu',
      name: 'Peter Parker',
      globalRole: 'USER',
    },
    {
      email: 'stephen.strange@sanctum.org',
      name: 'Stephen Strange',
      globalRole: 'USER',
    },
    {
      email: 'wanda.maximoff@westview.org',
      name: 'Wanda Maximoff',
      globalRole: 'USER',
    },
    {
      email: 'thor.odinson@newasgard.no',
      name: 'Thor Odinson',
      globalRole: 'USER',
    },
    {
      email: 'bruce.banner@avengershq.org',
      name: 'Bruce Banner',
      globalRole: 'USER',
    },
    {
      email: 'scott.lang@xconmail.com',
      name: 'Scott Lang',
      globalRole: 'USER',
    },
    {
      email: 'hope.vandyne@pymtech.com',
      name: 'Hope van Dyne',
      globalRole: 'USER',
    },
    {
      email: 'reed.richards@baxter.foundation',
      name: 'Reed Richards',
      globalRole: 'USER',
    },
    {
      email: 'sue.storm@baxter.foundation',
      name: 'Sue Storm',
      globalRole: 'USER',
    },
    {
      email: 'johnny.storm@baxter.foundation',
      name: 'Johnny Storm',
      globalRole: 'USER',
    },
    {
      email: 'ben.grimm@baxter.foundation',
      name: 'Ben Grimm',
      globalRole: 'USER',
    },
  ];

  const seededUsers = await Promise.all(
    usersToSeed.map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          globalRole: u.globalRole,
          password: commonPassword,
        },
        create: {
          email: u.email,
          name: u.name,
          password: commonPassword,
          globalRole: u.globalRole,
        },
      }),
    ),
  );

  const userByEmail = Object.fromEntries(
    seededUsers.map((u) => [u.email, u]),
  ) as Record<string, (typeof seededUsers)[number]>;

  const globalAdmins = [
    userByEmail['nick.fury@avengershq.org'],
    userByEmail['victor.doom@latveria.gov'],
  ];

  const contributors = [
    userByEmail['sam.wilson@avengershq.org'],
    userByEmail['bucky.barnes@avengershq.org'],
    userByEmail['carol.danvers@avengershq.org'],
    userByEmail['shuri@wakanda.gov'],
    userByEmail['peter.parker@midtown.edu'],
    userByEmail['stephen.strange@sanctum.org'],
    userByEmail['wanda.maximoff@westview.org'],
    userByEmail['thor.odinson@newasgard.no'],
    userByEmail['bruce.banner@avengershq.org'],
    userByEmail['scott.lang@xconmail.com'],
    userByEmail['hope.vandyne@pymtech.com'],
    userByEmail['reed.richards@baxter.foundation'],
    userByEmail['sue.storm@baxter.foundation'],
    userByEmail['johnny.storm@baxter.foundation'],
    userByEmail['ben.grimm@baxter.foundation'],
  ];

  const allTaskSummaries: BoardTaskSummary[] = [];
  let totalTaskCount = 0;
  let firstBacklogBoardId = '';

  for (
    let projectIndex = 0;
    projectIndex < projectBlueprints.length;
    projectIndex++
  ) {
    const blueprint = projectBlueprints[projectIndex];

    const activeMembers = [
      contributors[projectIndex % contributors.length],
      contributors[(projectIndex + 2) % contributors.length],
      contributors[(projectIndex + 4) % contributors.length],
    ];

    const project = await prisma.project.create({
      data: {
        name: blueprint.name,
        description: blueprint.description,
        members: {
          create: [
            {
              user: { connect: { id: globalAdmins[0].id } },
              role: 'PROJECT_ADMIN',
            },
            {
              user: { connect: { id: globalAdmins[1].id } },
              role: 'PROJECT_ADMIN',
            },
            // Every non-admin gets a project-specific role that rotates by project index.
            ...contributors.map((member, memberIndex) => ({
              user: { connect: { id: member.id } },
              role: projectRoleCycle[
                (memberIndex + projectIndex) % projectRoleCycle.length
              ],
            })),
          ],
        },
      },
    });

    for (let boardIndex = 0; boardIndex < boardNames.length; boardIndex++) {
      const board = await prisma.board.create({
        data: {
          name: `${boardNames[boardIndex]} - ${project.name}`,
          project: { connect: { id: project.id } },
        },
      });

      const [storiesCol, backlogCol, progressCol, reviewCol, doneCol] =
        await Promise.all([
          prisma.column.create({
            data: {
              name: 'Stories',
              order: 0,
              board: { connect: { id: board.id } },
            },
          }),
          prisma.column.create({
            data: {
              name: 'To Do',
              order: 1,
              board: { connect: { id: board.id } },
            },
          }),
          prisma.column.create({
            data: {
              name: 'In Progress',
              order: 2,
              wipLimit: 4,
              board: { connect: { id: board.id } },
            },
          }),
          prisma.column.create({
            data: {
              name: 'Review',
              order: 3,
              wipLimit: 3,
              board: { connect: { id: board.id } },
            },
          }),
          prisma.column.create({
            data: {
              name: 'Done',
              order: 4,
              board: { connect: { id: board.id } },
            },
          }),
        ]);

      if (!firstBacklogBoardId) {
        firstBacklogBoardId = board.id;
      }

      const projectTag = project.name.split(' ').slice(0, 2).join(' ');

      const story = await prisma.task.create({
        data: {
          title: `${projectTag}: baseline scope map`,
          description:
            'Define the smallest end-to-end slice and map sequencing constraints.',
          type: 'STORY',
          priority: 'HIGH',
          board: { connect: { id: board.id } },
          column: { connect: { id: storiesCol.id } },
          reporter: { connect: { id: activeMembers[0].id } },
          assignee: { connect: { id: activeMembers[0].id } },
          dueDate: new Date(
            `2026-04-${String(6 + boardIndex).padStart(2, '0')}T18:00:00.000Z`,
          ),
        },
      });

      allTaskSummaries.push({
        id: story.id,
        reporterId: activeMembers[0].id,
        createdAt: story.createdAt,
      });

      const boardTaskPayloads = [
        {
          title: `${projectTag}: intel source contracts`,
          description:
            'Catalog upstream intelligence sources and confidence levels.',
          type: 'TASK' as const,
          priority: 'MEDIUM' as const,
          columnId: backlogCol.id,
          assigneeId: activeMembers[1].id,
          parentId: story.id,
        },
        {
          title: `${projectTag}: anomaly reconciliation`,
          description:
            'Capture malformed signatures from prior multiverse incident reports.',
          type: 'BUG' as const,
          priority: 'HIGH' as const,
          columnId: backlogCol.id,
          assigneeId: activeMembers[2].id,
          parentId: story.id,
        },
        {
          title: `${projectTag}: containment guardrails`,
          description:
            'Add fail-safe constraints and fallback handling for partial telemetry.',
          type: 'TASK' as const,
          priority: 'HIGH' as const,
          columnId: progressCol.id,
          assigneeId: activeMembers[0].id,
          parentId: story.id,
        },
        {
          title: `${projectTag}: response queue hardening`,
          description:
            'Reduce duplicate response dispatches under comms jitter and packet loss.',
          type: 'TASK' as const,
          priority: 'CRITICAL' as const,
          columnId: progressCol.id,
          assigneeId: activeMembers[1].id,
          parentId: story.id,
        },
        {
          title: `${projectTag}: command dashboard parity`,
          description:
            'Validate parity between command dashboards and raw field events.',
          type: 'BUG' as const,
          priority: 'MEDIUM' as const,
          columnId: progressCol.id,
          assigneeId: activeMembers[2].id,
          parentId: story.id,
        },
        {
          title: `${projectTag}: strike-team verification`,
          description:
            'Run structured peer verification on assumptions and alert thresholds.',
          type: 'TASK' as const,
          priority: 'MEDIUM' as const,
          columnId: reviewCol.id,
          assigneeId: activeMembers[0].id,
          parentId: null,
        },
        {
          title: `${projectTag}: deployment readiness checklist`,
          description:
            'Confirm rollback plans before entering high-risk mission windows.',
          type: 'TASK' as const,
          priority: 'HIGH' as const,
          columnId: reviewCol.id,
          assigneeId: activeMembers[1].id,
          parentId: null,
        },
        {
          title: `${projectTag}: operations handoff`,
          description:
            'Archive runbooks and transfer on-call ownership for sustained monitoring.',
          type: 'TASK' as const,
          priority: 'LOW' as const,
          columnId: doneCol.id,
          assigneeId: activeMembers[2].id,
          parentId: null,
        },
        {
          title: `${projectTag}: incident retrospective`,
          description:
            'Summarize misses and convert findings into backlog-ready actions.',
          type: 'TASK' as const,
          priority: 'LOW' as const,
          columnId: doneCol.id,
          assigneeId: activeMembers[0].id,
          parentId: null,
        },
      ];

      for (
        let payloadIndex = 0;
        payloadIndex < boardTaskPayloads.length;
        payloadIndex++
      ) {
        const payload = boardTaskPayloads[payloadIndex];
        const reporterId =
          activeMembers[payloadIndex % activeMembers.length].id;
        const created = await prisma.task.create({
          data: {
            title: payload.title,
            description: payload.description,
            type: payload.type,
            priority: payload.priority,
            board: { connect: { id: board.id } },
            column: { connect: { id: payload.columnId } },
            reporter: { connect: { id: reporterId } },
            assignee: { connect: { id: payload.assigneeId } },
            dueDate: new Date(
              `2026-04-${String(9 + boardIndex + (payloadIndex % 3)).padStart(2, '0')}T16:00:00.000Z`,
            ),
            parent:
              payload.parentId !== null
                ? { connect: { id: payload.parentId } }
                : undefined,
            resolvedAt:
              payload.columnId === doneCol.id
                ? new Date(
                    `2026-03-${String(20 + (payloadIndex % 5)).padStart(2, '0')}T11:00:00.000Z`,
                  )
                : undefined,
            closedAt:
              payload.columnId === doneCol.id
                ? new Date(
                    `2026-03-${String(20 + (payloadIndex % 5)).padStart(2, '0')}T13:00:00.000Z`,
                  )
                : undefined,
          },
        });

        allTaskSummaries.push({
          id: created.id,
          reporterId,
          createdAt: created.createdAt,
        });
      }

      totalTaskCount += 10;
    }
  }

  if (totalTaskCount < TARGET_TASK_COUNT && firstBacklogBoardId) {
    const remaining = TARGET_TASK_COUNT - totalTaskCount;
    const fallbackReporter = contributors[0];

    const firstBacklogColumn = await prisma.column.findFirstOrThrow({
      where: { boardId: firstBacklogBoardId, name: 'To Do' },
      select: { id: true },
    });

    for (let i = 0; i < remaining; i++) {
      const extraTask = await prisma.task.create({
        data: {
          title: `Omega watchlist triage ${i + 1}`,
          description:
            'Track cross-project blockers that can delay synchronized mission timelines.',
          type: i % 2 === 0 ? 'TASK' : 'BUG',
          priority: i % 3 === 0 ? 'CRITICAL' : 'HIGH',
          board: { connect: { id: firstBacklogBoardId } },
          column: { connect: { id: firstBacklogColumn.id } },
          reporter: { connect: { id: fallbackReporter.id } },
          assignee: {
            connect: { id: contributors[(i + 1) % contributors.length].id },
          },
          dueDate: new Date(
            `2026-04-${String(20 + (i % 8)).padStart(2, '0')}T12:00:00.000Z`,
          ),
        },
      });

      allTaskSummaries.push({
        id: extraTask.id,
        reporterId: fallbackReporter.id,
        createdAt: extraTask.createdAt,
      });
    }

    totalTaskCount = TARGET_TASK_COUNT;
  }

  const commentBatch: {
    content: string;
    authorId: string;
    taskId: string;
    createdAt: Date;
  }[] = [];
  const commentTasks = allTaskSummaries.slice(0, 40);

  for (let i = 0; i < commentTasks.length; i++) {
    const task = commentTasks[i];
    for (let j = 0; j < 3; j++) {
      commentBatch.push({
        content: commentSnippets[(i + j) % commentSnippets.length],
        authorId: contributors[(i + j) % contributors.length].id,
        taskId: task.id,
        createdAt: new Date(
          task.createdAt.getTime() + (j + 1) * 60 * 60 * 1000,
        ),
      });
    }
  }

  await prisma.comment.createMany({ data: commentBatch });

  await prisma.notification.createMany({
    data: contributors.map((u, idx) => ({
      userId: u.id,
      content:
        idx % 2 === 0
          ? 'You were tagged in a threat-board debrief comment.'
          : 'A mission task assigned to you has moved to debrief.',
      isRead: idx % 3 === 0,
      createdAt: new Date(
        `2026-03-${String(10 + idx).padStart(2, '0')}T10:30:00.000Z`,
      ),
    })),
  });

  const createdAuditLogs = allTaskSummaries.map((task, idx) => ({
    taskId: task.id,
    userId: task.reporterId,
    action: 'CREATED',
    oldValue: null,
    newValue: null,
    timestamp: task.createdAt,
  }));

  await prisma.auditLog.createMany({ data: createdAuditLogs });

  const statusAuditLogs = allTaskSummaries.slice(0, 36).map((task, idx) => ({
    taskId: task.id,
    userId: contributors[idx % contributors.length].id,
    action: idx % 2 === 0 ? 'STATUS_CHANGED' : 'ASSIGNEE_CHANGED',
    oldValue:
      idx % 2 === 0
        ? 'TO_DO'
        : contributors[(idx + 2) % contributors.length].name,
    newValue:
      idx % 2 === 0
        ? 'IN_PROGRESS'
        : contributors[(idx + 3) % contributors.length].name,
    // Keep follow-up activity after creation (+4h to +8h) for consistent timeline ordering.
    timestamp: new Date(
      task.createdAt.getTime() + (4 + (idx % 5)) * 60 * 60 * 1000,
    ),
  }));

  await prisma.auditLog.createMany({ data: statusAuditLogs });

  console.log('============================================');
  console.log('Seed complete with Avengers Doomsday topology');
  console.log('============================================');
  console.log(`Projects: ${projectBlueprints.length}`);
  console.log(`Boards: ${projectBlueprints.length * boardNames.length}`);
  console.log(`Tasks: ${totalTaskCount}`);
  console.log(`Comments: ${commentBatch.length}`);
  console.log('Login password for seeded users: 616');
  console.log('Primary users:');
  usersToSeed.forEach((u) => {
    const suffix = u.globalRole === 'GLOBAL_ADMIN' ? ' (GLOBAL_ADMIN)' : '';
    console.log(`  ${u.email}${suffix}`);
  });
  console.log('============================================');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
