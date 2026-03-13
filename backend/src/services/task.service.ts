import prisma from '../utils/prisma';
import { TaskType, Priority, Task } from '@prisma/client';
import { createNotification } from './notification.service';

const verifyTaskPermissions = async (userId: string, boardId: string, globalRole?: string) : Promise<void> => {
    if (globalRole === 'GLOBAL_ADMIN') {
        return;
    }

    const board = await prisma.board.findUnique({ where: { id: boardId }, select: { projectId: true }});
    if (!board) {
        throw new Error('Board not found');
    }

    const member = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId: board.projectId } },
    });

    if (!member) {
        throw new Error('Forbidden: You are not a member of this project');
    }

    if (member.role === 'PROJECT_VIEWER') {
        throw new Error('Forbidden: Viewers cannot modify tasks');
    }
};

const checkWipLimit = async (columnId: string): Promise<void> => {
    const column = await prisma.column.findUnique({
        where: { id: columnId },
        select: { wipLimit: true },
    });

    if (column?.wipLimit) {
        const count = await prisma.task.count({ where: { columnId } });
        if (count >= column.wipLimit) {
            throw new Error(`WIP limit (${column.wipLimit}) reached for this column`);
        }
    }
};

const checkStoryChildren = async (taskId: string): Promise<void> => {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { children: true },
    });

    if (task?.type === 'STORY') {
        const incompleteChild = task.children.find(c => !c.resolvedAt && !c.closedAt);
        if (incompleteChild) {
            throw new Error('Cannot resolve or close a Story with incomplete subtasks');
        }
    }
};

export const makeTask = async (data: {
    title: string;
    description?: string;
    type: TaskType;
    priority: Priority;
    dueDate?: string | null;
    columnId: string;
    boardId: string;
    reporterId: string;
    assigneeId?: string | null;
    parentId?: string | null;
}, userId: string, globalRole?: string): Promise<Task> => {
    await verifyTaskPermissions(userId, data.boardId, globalRole);

    if (data.assigneeId) {
        const board = await prisma.board.findUnique({
            where: { id: data.boardId },
            select: { projectId: true },
        });

        if (!board) {
            throw new Error('Board not found');
        }

        const isMember = await prisma.projectMember.findFirst({
            where: {
                projectId: board.projectId,
                userId: data.assigneeId,
            },
        });

        if (!isMember) {
            throw new Error('Assignee must be a member of the project');
        }
    }

    await checkWipLimit(data.columnId);

    const task = await prisma.task.create({
        data: {
            title: data.title,
            description: data.description,
            type: data.type,
            priority: data.priority,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            columnId: data.columnId,
            boardId: data.boardId,
            reporterId: data.reporterId,
            assigneeId: data.assigneeId,
            parentId: data.parentId,
        },
    });

    if (data.assigneeId) {
        await createNotification(data.assigneeId, `You have been assigned to task: ${data.title}`);
    }

    return task;
};

export const moveTask = async (id: string, cId: string, userId: string, globalRole?: string): Promise<Task> => {
    const task = await prisma.task.findUnique({
        where: { id },
        include: { column: true, board: true },
    });

    if (!task) {
        throw new Error('Task not found');
    }

    await verifyTaskPermissions(userId, task.boardId, globalRole);

    const targetCol = await prisma.column.findUnique({
        where: { id: cId },
    });

    if (!targetCol) {
        throw new Error('Target column not found');
    }

    if (task.type !== 'STORY') {
        const currentOrder = task.column.order;
        const targetOrder = targetCol.order;

        if (Math.abs(currentOrder - targetOrder) > 1) {
            throw new Error('Invalid Transition: Tasks can only be moved to adjacent columns');
        }
        await checkWipLimit(cId);
    }

    const columnName = targetCol.name.toLowerCase();
    const isResolved = columnName.includes('done') || columnName.includes('resolved');

    if (isResolved) {
        await checkStoryChildren(id);
    }

    const updatedTask = await prisma.task.update({
        where: { id },
        data: {
            columnId: cId,
            resolvedAt: isResolved ? new Date() : null,
        },
    });

    return updatedTask;
};

export const removeTask = async (id: string, userId: string, globalRole?: string): Promise<Task> => {
    const task = await prisma.task.findUnique({
        where: { id },
        select: { boardId: true },
    });

    if (!task) {
        throw new Error('Task not found');
    }

    await verifyTaskPermissions(userId, task.boardId, globalRole);

    const c = await prisma.task.count({
        where: { parentId: id },
    });

    if (c > 0) {
        const children = await prisma.task.findMany({
            where: { parentId: id },
            select: { id: true },
        });
        
        for (const child of children) {
            await removeTask(child.id, userId, globalRole);
        }
    }

    return prisma.task.delete({
        where: { id },
    });
};

export const closeTask = async (id: string, userId: string, globalRole?: string): Promise<Task> => {
    const task = await prisma.task.findUnique({
        where: { id },
        select: { boardId: true },
    });

    if (!task) {
        throw new Error('Task not found');
    }

    await verifyTaskPermissions(userId, task.boardId, globalRole);

    await checkStoryChildren(id);

    return prisma.task.update({
        where: { id },
        data: { closedAt: new Date() },
    });
};

export const updateTask = async (
    id: string, 
    data: Partial<{
        title: string;
        description: string | null;
        type: TaskType;
        priority: Priority;
        dueDate: string | null;
        assigneeId: string | null;
        parentId: string | null;
    }>, 
    userId: string, 
    globalRole?: string
): Promise<Task> => {
    const task = await prisma.task.findUnique({
        where: { id },
        select: { boardId: true, assigneeId: true, type: true },
    });

    if (!task) {
        throw new Error('Task not found');
    }

    await verifyTaskPermissions(userId, task.boardId, globalRole);

    if (data.assigneeId !== undefined && data.assigneeId !== task.assigneeId) {
        if (data.assigneeId) {
            const board = await prisma.board.findUnique({
                where: { id: task.boardId },
                select: { projectId: true },
            });
            
            if (!board) {
                throw new Error('Board not found');
            }

            const isMember = await prisma.projectMember.findUnique({
                where: {
                    userId_projectId: {
                        projectId: board.projectId,
                        userId: data.assigneeId,
                    },
                },
            });

            if (!isMember) {
                throw new Error('Assignee must be a member of the project');
            }
        }
    }

    const updatedTask = await prisma.task.update({
        where: { id },
        data: {
            title: data.title,
            description: data.description,
            type: data.type,
            priority: data.priority,
            dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
            assigneeId: data.assigneeId,
            parentId: data.parentId,
        },
    });

    if (data.assigneeId && data.assigneeId !== task.assigneeId && data.assigneeId !== userId) {
        await createNotification(data.assigneeId, `Your assigned task has been updated: ${updatedTask.title}`);
    }
    
    return updatedTask;
};