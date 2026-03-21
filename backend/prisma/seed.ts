/// <reference types="node" />
import bcrypt from 'bcrypt';
import prisma from '../src/utils/prisma';

type SeedUser = {
  email: string;
  name: string;
  globalRole: 'GLOBAL_ADMIN' | 'USER';
  avatarUrl: string;
};

type ProjectBlueprint = {
  name: string;
  description: string;
  localMembers: string[];
  supportMembers: string[];
};

type BoardTaskSummary = {
  id: string;
  reporterId: string;
  createdAt: Date;
};

const PASSWORD = '616';
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
    localMembers: [
      'sam.wilson@avengershq.org',
      'bucky.barnes@avengershq.org',
      'shuri@wakanda.gov',
    ],
    supportMembers: [
      'stephen.strange@sanctum.org',
      'carol.danvers@avengershq.org',
    ],
  },
  {
    name: 'Baxter Recovery Initiative',
    description:
      'Secure high-risk research assets and rebuild chain-of-custody reliability.',
    localMembers: [
      'reed.richards@baxter.foundation',
      'sue.storm@baxter.foundation',
      'johnny.storm@baxter.foundation',
      'ben.grimm@baxter.foundation',
    ],
    supportMembers: ['peter.parker@midtown.edu', 'shuri@wakanda.gov'],
  },
  {
    name: 'Kang Signal Intercept',
    description:
      'Track temporal anomalies and stabilize multiverse-adjacent telemetry channels.',
    localMembers: [
      'stephen.strange@sanctum.org',
      'wanda.maximoff@westview.org',
      'carol.danvers@avengershq.org',
    ],
    supportMembers: ['bruce.banner@avengershq.org', 'scott.lang@xconmail.com'],
  },
  {
    name: 'Vibranium Shield Grid',
    description:
      'Expand defensive mesh coverage over vulnerable metropolitan corridors.',
    localMembers: [
      'shuri@wakanda.gov',
      'sam.wilson@avengershq.org',
      'carol.danvers@avengershq.org',
    ],
    supportMembers: [
      'thor.odinson@newasgard.no',
      'bucky.barnes@avengershq.org',
    ],
  },
  {
    name: 'Sokovia Archive Reconstruction',
    description:
      'Reassemble fragmented incident records for legal, diplomatic, and strategic review.',
    localMembers: [
      'bucky.barnes@avengershq.org',
      'wanda.maximoff@westview.org',
      'bruce.banner@avengershq.org',
    ],
    supportMembers: ['sam.wilson@avengershq.org', 'peter.parker@midtown.edu'],
  },
  {
    name: 'Sanctum Ward Reinforcement',
    description:
      'Harden magical containment boundaries against coordinated breach attempts.',
    localMembers: [
      'stephen.strange@sanctum.org',
      'wanda.maximoff@westview.org',
      'thor.odinson@newasgard.no',
    ],
    supportMembers: [
      'reed.richards@baxter.foundation',
      'sue.storm@baxter.foundation',
    ],
  },
  {
    name: 'Stark Orbital Readiness',
    description:
      'Recalibrate orbital response assets for rapid global threat redeployment.',
    localMembers: [
      'carol.danvers@avengershq.org',
      'bruce.banner@avengershq.org',
      'sam.wilson@avengershq.org',
    ],
    supportMembers: [
      'thor.odinson@newasgard.no',
      'reed.richards@baxter.foundation',
    ],
  },
  {
    name: 'Midtown Evacuation Matrix',
    description:
      'Tune civilian safety routing and emergency comms under urban combat constraints.',
    localMembers: [
      'peter.parker@midtown.edu',
      'scott.lang@xconmail.com',
      'hope.vandyne@pymtech.com',
    ],
    supportMembers: ['sam.wilson@avengershq.org', 'shuri@wakanda.gov'],
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
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/489-nick-fury.jpg',
    },
    {
      email: 'victor.doom@latveria.gov',
      name: 'Victor Von Doom',
      globalRole: 'GLOBAL_ADMIN',
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/222-doctor-doom.jpg',
    },
    {
      email: 'sam.wilson@avengershq.org',
      name: 'Sam Wilson',
      globalRole: 'USER',
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/251-falcon.jpg',
    },
    {
      email: 'bucky.barnes@avengershq.org',
      name: 'Bucky Barnes',
      globalRole: 'USER',
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/714-winter-soldier.jpg',
    },
    {
      email: 'carol.danvers@avengershq.org',
      name: 'Carol Danvers',
      globalRole: 'USER',
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/157-captain-marvel.jpg',
    },
    {
      email: 'shuri@wakanda.gov',
      name: 'Shuri',
      globalRole: 'USER',
      avatarUrl:
        'https://m.media-amazon.com/images/I/91kNoVziYVL._AC_UF1000,1000_QL80_.jpg',
    },
    {
      email: 'peter.parker@midtown.edu',
      name: 'Peter Parker',
      globalRole: 'USER',
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/620-spider-man.jpg',
    },
    {
      email: 'stephen.strange@sanctum.org',
      name: 'Stephen Strange',
      globalRole: 'USER',
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/226-doctor-strange.jpg',
    },
    {
      email: 'wanda.maximoff@westview.org',
      name: 'Wanda Maximoff',
      globalRole: 'USER',
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/579-scarlet-witch.jpg',
    },
    {
      email: 'thor.odinson@newasgard.no',
      name: 'Thor Odinson',
      globalRole: 'USER',
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/659-thor.jpg',
    },
    {
      email: 'bruce.banner@avengershq.org',
      name: 'Bruce Banner',
      globalRole: 'USER',
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/332-hulk.jpg',
    },
    {
      email: 'scott.lang@xconmail.com',
      name: 'Scott Lang',
      globalRole: 'USER',
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/30-ant-man.jpg',
    },
    {
      email: 'hope.vandyne@pymtech.com',
      name: 'Hope van Dyne',
      globalRole: 'USER',
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/708-wasp.jpg',
    },
    {
      email: 'reed.richards@baxter.foundation',
      name: 'Reed Richards',
      globalRole: 'USER',
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/456-mister-fantastic.jpg',
    },
    {
      email: 'sue.storm@baxter.foundation',
      name: 'Sue Storm',
      globalRole: 'USER',
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/344-invisible-woman.jpg',
    },
    {
      email: 'johnny.storm@baxter.foundation',
      name: 'Johnny Storm',
      globalRole: 'USER',
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/333-human-torch.jpg',
    },
    {
      email: 'ben.grimm@baxter.foundation',
      name: 'Ben Grimm',
      globalRole: 'USER',
      avatarUrl:
        'https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/md/658-thing.jpg',
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
          avatarUrl: u.avatarUrl,
        },
        create: {
          email: u.email,
          name: u.name,
          password: commonPassword,
          globalRole: u.globalRole,
          avatarUrl: u.avatarUrl,
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
    const projectMemberEmails = [
      ...blueprint.localMembers,
      ...blueprint.supportMembers,
    ];
    const projectMembers = projectMemberEmails.map(
      (email) => userByEmail[email],
    );

    const activeMembers = [
      projectMembers[0],
      projectMembers[1],
      projectMembers[2],
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
            // Members are project-local plus support, with role rotation inside this project.
            ...projectMembers.map((member, memberIndex) => ({
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
            `2025-12-${String(23 + boardIndex).padStart(2, '0')}T18:00:00.000Z`,
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
              `2025-12-${String(23 + boardIndex + (payloadIndex % 3)).padStart(2, '0')}T16:00:00.000Z`,
            ),
            parent:
              payload.parentId !== null
                ? { connect: { id: payload.parentId } }
                : undefined,
            resolvedAt:
              payload.columnId === doneCol.id
                ? new Date(
                  `2025-12-${String(23 + (payloadIndex % 5)).padStart(2, '0')}T11:00:00.000Z`,
                )
                : undefined,
            closedAt:
              payload.columnId === doneCol.id
                ? new Date(
                  `2025-12-${String(23 + (payloadIndex % 5)).padStart(2, '0')}T13:00:00.000Z`,
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
            `2025-12-${String(23 + (i % 8)).padStart(2, '0')}T12:00:00.000Z`,
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

  const commentAuditLogs = commentBatch.map((comment) => ({
    taskId: comment.taskId,
    userId: comment.authorId,
    action: 'COMMENT_ADDED',
    oldValue: null,
    newValue: comment.content,
    timestamp: comment.createdAt,
  }));

  await prisma.auditLog.createMany({ data: commentAuditLogs });

  await prisma.notification.createMany({
    data: contributors.map((u, idx) => ({
      userId: u.id,
      content:
        idx % 2 === 0
          ? 'You were tagged in a threat-board debrief comment.'
          : 'A mission task assigned to you has moved to debrief.',
      isRead: idx % 3 === 0,
      createdAt: new Date(
        `2025-12-${String(23 + (idx % 8)).padStart(2, '0')}T10:30:00.000Z`,
      ),
    })),
  });

  const createdAuditLogs = allTaskSummaries.map((task) => ({
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
  console.log(`Login password for seeded users: ${PASSWORD}`);
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
