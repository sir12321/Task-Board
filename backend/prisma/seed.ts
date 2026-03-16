/// <reference types="node" />
import prisma from '../src/utils/prisma';
import bcrypt from 'bcrypt';

async function main(): Promise<void> {
  const commonPassword = await bcrypt.hash('111', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@taskboard.com' },
    update: {},
    create: {
      email: 'admin@taskboard.com',
      name: 'Global Admin',
      password: commonPassword,
      globalRole: 'GLOBAL_ADMIN',
    },
  });

  const admin2 = await prisma.user.upsert({
    where: { email: 'admin2@taskboard.com' },
    update: {},
    create: {
      email: 'admin2@taskboard.com',
      name: 'Global Admin 2',
      password: commonPassword,
      globalRole: 'GLOBAL_ADMIN',
    },
  });

  // Create users matching mock data
  const manya = await prisma.user.upsert({
    where: { email: 'manya@iitd.ac.in' },
    update: {},
    create: {
      email: 'manya@iitd.ac.in',
      name: 'Manya Jain',
      password: commonPassword,
      globalRole: 'USER',
    },
  });

  const john = await prisma.user.upsert({
    where: { email: 'john@iitd.ac.in' },
    update: {},
    create: {
      email: 'john@iitd.ac.in',
      name: 'John Doe',
      password: commonPassword,
      globalRole: 'USER',
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: 'alice@iitd.ac.in' },
    update: {},
    create: {
      email: 'alice@iitd.ac.in',
      name: 'Alice Smith',
      password: commonPassword,
      globalRole: 'USER',
    },
  });

  console.log(
    '✓ Seeded users:',
    [manya.email, john.email, alice.email].join(', '),
  );

  // Create Demo Project
  let demoProject = await prisma.project.findFirst({
    where: { name: 'Demo Project' },
  });
  if (!demoProject) {
    demoProject = await prisma.project.create({
      data: {
        name: 'Demo Project',
        description: 'A demo project for TaskFlow',
        members: {
          create: [
            { user: { connect: { id: admin.id } }, role: 'PROJECT_ADMIN' },
            { user: { connect: { id: manya.id } }, role: 'PROJECT_ADMIN' },
            { user: { connect: { id: john.id } }, role: 'PROJECT_MEMBER' },
            { user: { connect: { id: alice.id } }, role: 'PROJECT_VIEWER' },
          ],
        },
      },
    });
  }

  console.log('✓ Seeded project:', demoProject.name);

  // Create Demo Board
  let demoBoard = await prisma.board.findFirst({
    where: { name: 'Demo Board', projectId: demoProject.id },
  });
  if (!demoBoard) {
    demoBoard = await prisma.board.create({
      data: {
        name: 'Demo Board',
        project: { connect: { id: demoProject.id } },
      },
    });
  }

  // Create standard columns
  const storyCol = await prisma.column.upsert({
    where: { id: 'col-story' },
    update: {},
    create: {
      id: 'col-story',
      name: 'Stories',
      order: 0,
      board: { connect: { id: demoBoard.id } },
    },
  });

  const backlogCol = await prisma.column.upsert({
    where: { id: 'col-backlog' },
    update: {},
    create: {
      id: 'col-backlog',
      name: 'To Do',
      order: 1,
      board: { connect: { id: demoBoard.id } },
    },
  });

  const progressCol = await prisma.column.upsert({
    where: { id: 'col-progress' },
    update: {},
    create: {
      id: 'col-progress',
      name: 'In Progress',
      order: 2,
      wipLimit: 3,
      board: { connect: { id: demoBoard.id } },
    },
  });

  const reviewCol = await prisma.column.upsert({
    where: { id: 'col-review' },
    update: {},
    create: {
      id: 'col-review',
      name: 'Review',
      order: 3,
      wipLimit: 3,
      board: { connect: { id: demoBoard.id } },
    },
  });

  const doneCol = await prisma.column.upsert({
    where: { id: 'col-done' },
    update: {},
    create: {
      id: 'col-done',
      name: 'Done',
      order: 4,
      board: { connect: { id: demoBoard.id } },
    },
  });

  console.log('✓ Seeded columns');

  // Create tasks
  let task1 = await prisma.task.findFirst({
    where: { title: 'Set up project', boardId: demoBoard.id },
  });
  if (!task1) {
    task1 = await prisma.task.create({
      data: {
        title: 'Set up project',
        description: 'Initialize repository and tooling',
        type: 'BUG',
        priority: 'HIGH',
        board: { connect: { id: demoBoard.id } },
        column: { connect: { id: progressCol.id } },
        reporter: { connect: { id: manya.id } },
        assignee: { connect: { id: john.id } },
        dueDate: new Date('2026-03-10T00:00:00.000Z'),
      },
    });
  }

  let task2 = await prisma.task.findFirst({
    where: { title: 'Implement login', boardId: demoBoard.id },
  });
  if (!task2) {
    task2 = await prisma.task.create({
      data: {
        title: 'Implement login',
        description: 'Create login UI and navigation',
        type: 'STORY',
        priority: 'MEDIUM',
        board: { connect: { id: demoBoard.id } },
        column: { connect: { id: storyCol.id } },
        reporter: { connect: { id: manya.id } },
        assignee: { connect: { id: manya.id } },
        dueDate: new Date('2026-03-12T00:00:00.000Z'),
      },
    });
  }

  const task3 = await prisma.task.findFirst({
    where: { title: 'Configure CI', boardId: demoBoard.id },
  });
  if (!task3) {
    await prisma.task.create({
      data: {
        title: 'Configure CI',
        description: 'Add lint and build steps',
        type: 'TASK',
        priority: 'HIGH',
        board: { connect: { id: demoBoard.id } },
        column: { connect: { id: backlogCol.id } },
        reporter: { connect: { id: manya.id } },
        assignee: { connect: { id: manya.id } },
        parent: { connect: { id: task2.id } },
        dueDate: new Date('2026-03-13T00:00:00.000Z'),
      },
    });
  }

  let task4 = await prisma.task.findFirst({
    where: { title: 'Write documentation', boardId: demoBoard.id },
  });
  if (!task4) {
    task4 = await prisma.task.create({
      data: {
        title: 'Write documentation',
        description: 'Document API endpoints and usage',
        type: 'TASK',
        priority: 'MEDIUM',
        board: { connect: { id: demoBoard.id } },
        column: { connect: { id: reviewCol.id } },
        reporter: { connect: { id: john.id } },
        assignee: { connect: { id: alice.id } },
        dueDate: new Date('2026-03-15T00:00:00.000Z'),
      },
    });
  }

  const task5 = await prisma.task.findFirst({
    where: { title: 'Setup database migrations', boardId: demoBoard.id },
  });
  if (!task5) {
    await prisma.task.create({
      data: {
        title: 'Setup database migrations',
        description: 'Configure Prisma migrations and seed scripts',
        type: 'TASK',
        priority: 'HIGH',
        board: { connect: { id: demoBoard.id } },
        column: { connect: { id: doneCol.id } },
        reporter: { connect: { id: john.id } },
        assignee: { connect: { id: john.id } },
        dueDate: new Date('2026-03-05T00:00:00.000Z'),
        resolvedAt: new Date('2026-03-07T16:00:00.000Z'),
        closedAt: new Date('2026-03-07T16:30:00.000Z'),
      },
    });
  }

  console.log('✓ Seeded tasks');

  // --- Additional seeded users, projects, boards, columns and tasks ---
  // Create 4 extra users and for each create 2-3 projects, each with 2-3 boards.
  // Each board will get standard columns and each column will receive 1-3 tasks.
  const extraUsersData = [
    { email: 'bob@iitd.ac.in', name: 'Bob Martin' },
    { email: 'carol@iitd.ac.in', name: 'Carol Nguyen' },
    { email: 'dave@iitd.ac.in', name: 'Dave Patel' },
    { email: 'eve@iitd.ac.in', name: 'Eve Lopez' },
  ];

  const extraUsers = [] as any[];
  for (const u of extraUsersData) {
    // upsert user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        password: commonPassword,
        globalRole: 'USER',
      },
    });
    extraUsers.push(created);
  }

  console.log(
    '✓ Seeded extra users:',
    extraUsers.map((x) => x.email).join(', '),
  );

  // Helper to pick a random integer between min and max inclusive
  const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const taskTypes = ['TASK', 'STORY', 'BUG'] as const;
  const priorities = ['LOW', 'MEDIUM', 'HIGH'] as const;

  for (const user of extraUsers) {
    const projectsCount = randInt(2, 3);
    for (let p = 0; p < projectsCount; p++) {
      const projectNamesPool = [
        'Website Redesign',
        'Mobile App Revamp',
        'Marketing Automation',
        'Analytics Dashboard',
        'Integrations Platform',
        'Customer Portal',
        'Onboarding Flow',
      ];

      const projectDescriptionsPool = [
        'Revamp the public website to improve conversions and accessibility.',
        'Modernize the mobile app UX and add offline support.',
        'Automate marketing workflows and improve lead scoring.',
        'Build a dashboard for product analytics and KPIs.',
        'Develop connectors and integrations with popular third-party services.',
        'Create a self-service portal for customers to manage accounts.',
        'Improve user onboarding with guided tours and tips.',
      ];

      const baseProjectName = projectNamesPool[p % projectNamesPool.length];
      const projectName = `${user.name.split(' ')[0]}'s ${baseProjectName}`;
      const projectDescription =
        projectDescriptionsPool[p % projectDescriptionsPool.length];

      let project = await prisma.project.findFirst({
        where: { name: projectName },
      });
      if (!project) {
        project = await prisma.project.create({
          data: {
            name: projectName,
            description: projectDescription,
            members: {
              create: [
                { user: { connect: { id: user.id } }, role: 'PROJECT_ADMIN' },
                { user: { connect: { id: manya.id } }, role: 'PROJECT_MEMBER' },
                { user: { connect: { id: john.id } }, role: 'PROJECT_MEMBER' },
              ],
            },
          },
        });
      }

      const boardsCount = randInt(2, 3);
      const boardNamesPool = [
        'Development',
        'Design',
        'QA',
        'Backlog',
        'Sprint',
      ];
      for (let b = 0; b < boardsCount; b++) {
        const baseBoardName = boardNamesPool[b % boardNamesPool.length];
        const boardName = `${baseBoardName} Board`;
        let board = await prisma.board.findFirst({
          where: { name: boardName, projectId: project.id },
        });
        if (!board) {
          board = await prisma.board.create({
            data: {
              name: boardName,
              project: { connect: { id: project.id } },
            },
          });
        }

        // create five columns for the board (Stories must be first)
        const columnsSpec = [
          { key: 'stories', name: 'Stories', order: 0 },
          { key: 'backlog', name: 'To Do', order: 1 },
          { key: 'progress', name: 'In Progress', order: 2 },
          { key: 'review', name: 'Review', order: 3 },
          { key: 'done', name: 'Done', order: 4 },
        ];

        const createdColumns: any[] = [];
        for (const colSpec of columnsSpec) {
          const col = await prisma.column.create({
            data: {
              name: colSpec.name,
              order: colSpec.order,
              wipLimit:
                colSpec.key === 'progress' || colSpec.key === 'review'
                  ? randInt(1, 4)
                  : undefined,
              board: { connect: { id: board.id } },
            },
          });
          createdColumns.push(col);
        }

        // concise sample tasks per column
        const tasksByColumn: Record<string, string[]> = {
          Stories: ['Story 1', 'Story 2', 'Story 3'],
          'To Do': ['Reqs', 'Wireframes', 'API'],
          'In Progress': ['Auth', 'UI', 'Payments'],
          Review: ['Code review', 'A11y', 'Tests'],
          Done: ['Deploy', 'Merge hotfix', 'Tracking'],
        };

        // For each column, create 1-3 short tasks
        for (const col of createdColumns) {
          const pool = tasksByColumn[col.name] ?? [
            `Work: ${col.name}`,
            `Follow: ${col.name}`,
          ];
          // respect column wipLimit when seeding so we don't exceed WIP
          const maxAllowed =
            typeof col.wipLimit === 'number' && col.wipLimit > 0
              ? Math.floor(col.wipLimit)
              : 3;
          const tasksCount = randInt(1, Math.max(1, Math.min(3, maxAllowed)));
          for (let t = 0; t < tasksCount; t++) {
            const sample = pool[t % pool.length];
            const title = sample; // keep title short
            const existing = await prisma.task.findFirst({
              where: { title, boardId: board.id },
            });
            if (existing) continue;

            // enforce story-only in the Stories column; other columns get TASK or BUG
            let type: string;
            if (col.name === 'Stories') {
              type = 'STORY';
            } else {
              const nonStory = ['TASK', 'BUG'];
              type = nonStory[randInt(0, nonStory.length - 1)];
            }
            const priority = priorities[randInt(0, priorities.length - 1)];
            const assigneeChoice = [user, manya, john][randInt(0, 2)];

            await prisma.task.create({
              data: {
                title,
                description: `${sample} (${col.name})`,
                type: type as any,
                priority: priority as any,
                board: { connect: { id: board.id } },
                column: { connect: { id: col.id } },
                reporter: { connect: { id: manya.id } },
                assignee: { connect: { id: assigneeChoice.id } },
                dueDate: new Date(
                  Date.now() + randInt(3, 30) * 24 * 60 * 60 * 1000,
                ),
              },
            });
          }
        }
      }
    }
  }

  console.log('✓ Seeded extra projects, boards, columns and tasks');
  // Add multiple comments on task1 for testing alignment
  const task1CommentsCount = await prisma.comment.count({
    where: { taskId: task1.id },
  });
  if (task1CommentsCount === 0) {
    await prisma.comment.createMany({
      data: [
        {
          content:
            'Started working on this. Setting up the dev environment now.',
          authorId: john.id,
          taskId: task1.id,
          createdAt: new Date('2026-03-08T10:00:00.000Z'),
        },
        {
          content:
            'Great! Let me know if you need any help with the config files.',
          authorId: manya.id,
          taskId: task1.id,
          createdAt: new Date('2026-03-08T10:15:00.000Z'),
        },
        {
          content: 'Thanks! I might need help with Docker setup later.',
          authorId: john.id,
          taskId: task1.id,
          createdAt: new Date('2026-03-08T10:30:00.000Z'),
        },
        {
          content: 'No problem. I can pair with you this afternoon if needed.',
          authorId: manya.id,
          taskId: task1.id,
          createdAt: new Date('2026-03-08T11:00:00.000Z'),
        },
        {
          content: 'Perfect! How about 2 PM?',
          authorId: john.id,
          taskId: task1.id,
          createdAt: new Date('2026-03-08T11:15:00.000Z'),
        },
      ],
    });
  }

  // Add comments on task2
  const task2CommentsCount = await prisma.comment.count({
    where: { taskId: task2.id },
  });
  if (task2CommentsCount === 0) {
    await prisma.comment.createMany({
      data: [
        {
          content:
            'This is the main user story for authentication. Breaking it down into subtasks.',
          authorId: manya.id,
          taskId: task2.id,
          createdAt: new Date('2026-03-07T09:00:00.000Z'),
        },
        {
          content: 'Sounds good. Should we also include social login?',
          authorId: john.id,
          taskId: task2.id,
          createdAt: new Date('2026-03-07T09:30:00.000Z'),
        },
        {
          content: "Yes, let's add Google and GitHub OAuth as well.",
          authorId: manya.id,
          taskId: task2.id,
          createdAt: new Date('2026-03-07T10:00:00.000Z'),
        },
      ],
    });
  }

  // Add comments on task4
  const task4CommentsCount = await prisma.comment.count({
    where: { taskId: task4.id },
  });
  if (task4CommentsCount === 0) {
    await prisma.comment.createMany({
      data: [
        {
          content:
            'Working on the API documentation. Should have a draft ready by tomorrow.',
          authorId: john.id,
          taskId: task4.id,
          createdAt: new Date('2026-03-08T14:00:00.000Z'),
        },
        {
          content: 'Excellent! Make sure to include request/response examples.',
          authorId: john.id,
          taskId: task4.id,
          createdAt: new Date('2026-03-08T14:30:00.000Z'),
        },
        {
          content: 'Will do! Also adding authentication flow diagrams.',
          authorId: john.id,
          taskId: task4.id,
          createdAt: new Date('2026-03-08T15:00:00.000Z'),
        },
        {
          content:
            'Great work Alice! This will be really helpful for the team.',
          authorId: manya.id,
          taskId: task4.id,
          createdAt: new Date('2026-03-08T16:00:00.000Z'),
        },
      ],
    });
  }

  const existingNotificationCount = await prisma.notification.count({
    where: {
      userId: {
        in: [manya.id, john.id, alice.id],
      },
    },
  });

  if (existingNotificationCount === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId: manya.id,
          content: 'John Doe commented on "Set up project".',
          isRead: false,
          createdAt: new Date('2026-03-09T10:35:00.000Z'),
        },
        {
          userId: manya.id,
          content: 'Task "Configure CI" is due in 2 days.',
          isRead: false,
          createdAt: new Date('2026-03-09T17:00:00.000Z'),
        },
        {
          userId: john.id,
          content: 'You have been assigned to "Set up project".',
          isRead: true,
          createdAt: new Date('2026-03-08T08:00:00.000Z'),
        },
        {
          userId: john.id,
          content: 'Status changed on your task: "Set up project".',
          isRead: false,
          createdAt: new Date('2026-03-10T12:20:00.000Z'),
        },
        {
          userId: alice.id,
          content: 'New comment on your task: "Write documentation".',
          isRead: false,
          createdAt: new Date('2026-03-10T14:30:00.000Z'),
        },
      ],
    });
  }

  console.log('\n════════════════════════════════════════════');
  console.log('📧 Login credentials (password: 111)');
  console.log('════════════════════════════════════════════');
  console.log('  admin@taskboard.com → GLOBAL_ADMIN');
  console.log('  admin2@taskboard.com → GLOBAL_ADMIN');
  console.log('  manya@iitd.ac.in    → PROJECT_ADMIN');
  console.log('  john@iitd.ac.in     → PROJECT_MEMBER');
  console.log('  alice@iitd.ac.in    → PROJECT_VIEWER');
  console.log('════════════════════════════════════════════\n');
  console.log('✨ Seed completed successfully!\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
