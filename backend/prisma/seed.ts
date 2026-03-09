/// <reference types="node" />
import prisma from '../src/utils/prisma';
import bcrypt from 'bcrypt';

async function main(): Promise<void> {
    const commonPassword = await bcrypt.hash('111', 10);

    // Create users matching mock data
    const manya = await prisma.user.upsert({
        where: { email: 'manya@iitd.ac.in' },
        update: {},
        create: {
            email: 'manya@iitd.ac.in',
            name: 'Manya Jain',
            password: commonPassword,
            globalRole: 'USER',
        }
    });

    const john = await prisma.user.upsert({
        where: { email: 'john@iitd.ac.in' },
        update: {},
        create: {
            email: 'john@iitd.ac.in',
            name: 'John Doe',
            password: commonPassword,
            globalRole: 'USER',
        }
    });

    const alice = await prisma.user.upsert({
        where: { email: 'alice@iitd.ac.in' },
        update: {},
        create: {
            email: 'alice@iitd.ac.in',
            name: 'Alice Smith',
            password: commonPassword,
            globalRole: 'USER',
        }
    });

    console.log('✓ Seeded users:', [manya.email, john.email, alice.email].join(', '));

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

    let task3 = await prisma.task.findFirst({
        where: { title: 'Configure CI', boardId: demoBoard.id },
    });
    if (!task3) {
        task3 = await prisma.task.create({
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

    let task5 = await prisma.task.findFirst({
        where: { title: 'Setup database migrations', boardId: demoBoard.id },
    });
    if (!task5) {
        task5 = await prisma.task.create({
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

    // Add multiple comments on task1 for testing alignment
    const task1CommentsCount = await prisma.comment.count({
        where: { taskId: task1.id },
    });
    if (task1CommentsCount === 0) {
        await prisma.comment.createMany({
            data: [
                {
                    content: 'Started working on this. Setting up the dev environment now.',
                    authorId: john.id,
                    taskId: task1.id,
                    createdAt: new Date('2026-03-08T10:00:00.000Z'),
                },
                {
                    content: 'Great! Let me know if you need any help with the config files.',
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
                    content: 'This is the main user story for authentication. Breaking it down into subtasks.',
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
                    content: 'Yes, let\'s add Google and GitHub OAuth as well.',
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
                    content: 'Working on the API documentation. Should have a draft ready by tomorrow.',
                    authorId: alice.id,
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
                    authorId: alice.id,
                    taskId: task4.id,
                    createdAt: new Date('2026-03-08T15:00:00.000Z'),
                },
                {
                    content: 'Great work Alice! This will be really helpful for the team.',
                    authorId: manya.id,
                    taskId: task4.id,
                    createdAt: new Date('2026-03-08T16:00:00.000Z'),
                },
            ],
        });
    }

    console.log('✓ Seeded comments');
    console.log('\n════════════════════════════════════════════');
    console.log('📧 Login credentials (password: 111)');
    console.log('════════════════════════════════════════════');
    console.log('  manya@iitd.ac.in   → PROJECT_ADMIN');
    console.log('  john@iitd.ac.in    → PROJECT_MEMBER');
    console.log('  alice@iitd.ac.in   → PROJECT_VIEWER');
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