import prisma from '../utils/prisma';
import { TaskType, Priority } from '@prisma/client';

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
}) => {
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
    
    return prisma.task.create({
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
};

export const moveTask = async (id: string, cId: string) => {
  return prisma.task.update({
    where: { id },
    data: { columnId: cId },
  });
};

export const removeTask = async (id : string) => {
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