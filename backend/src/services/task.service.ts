import prisma from '../utils/prisma';
import { TaskType, Priority, Task } from '@prisma/client';
import { createNotification } from './notification.service';

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
}): Promise<Task> => {
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

export const moveTask = async (id: string, cId: string): Promise<Task> => {

    const targetCol = await prisma.column.findUnique({
        where: { id: cId },
        select: { name: true },
    });

    if (!targetCol) {
        throw new Error('Target column not found');
    }

    const columnName = targetCol.name.toLowerCase();
    const isResolved = columnName.includes('done') || columnName.includes('resolved');

    if (isResolved) {
        await checkStoryChildren(id);
    } else {
        await checkWipLimit(cId);
    }

    const task = await prisma.task.update({
        where: { id },
        data: {
            columnId: cId,
            resolvedAt: isResolved ? new Date() : null,
        },
    });

    if (task.assigneeId) {
        await createNotification(task.assigneeId, `Status changed on your task: ${task.title}`);
    }

    return task;
};

export const removeTask = async (id: string): Promise<Task> => {
    const c = await prisma.task.count({
        where: { parentId: id },
    });

    if (c > 0) {
        throw new Error('Cannot delete task with subtasks');
    }

    return prisma.task.delete({
        where: { id },
    });
};

export const closeTask = async (id: string): Promise<Task> => {
    await checkStoryChildren(id);

    return prisma.task.update({
        where: { id },
        data: { closedAt: new Date() },
    });
};