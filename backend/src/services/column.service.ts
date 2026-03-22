import prisma from '../utils/prisma';
import { Column } from '@prisma/client';
import { parseWorkflowColumnIds } from '../utils/workflow.util';
import { touchProjectByBoardId } from '../utils/touchProject.util';

const verifyAdmin = async (
  userId: string,
  boardId: string,
  globalRole?: string,
): Promise<void> => {
  if (globalRole === 'GLOBAL_ADMIN') return;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { projectId: true },
  });

  if (!board) {
    throw new Error('Board not found');
  }

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId: board.projectId } },
  });

  if (!member || member.role !== 'PROJECT_ADMIN') {
    throw new Error(
      'Forbidden: Only Global Admins or Project Admins can perform this action.',
    );
  }
};

export const createColumn = async (
  userId: string,
  boardId: string,
  name: string,
  wipLimit: number | null,
  globalRole?: string,
): Promise<Column> => {
  await verifyAdmin(userId, boardId, globalRole);

  const lastColumn = await prisma.column.findFirst({
    where: { boardId },
    orderBy: { order: 'desc' },
  });

  const newOrder = lastColumn ? lastColumn.order + 1 : 0;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      workflowColumnIds: true,
      closedColumnId: true,
    },
  });

  return prisma.$transaction(async (tx) => {
    const column = await tx.column.create({
      data: {
        name,
        wipLimit,
        order: newOrder,
        boardId,
      },
    });

    const workflowColumnIds = parseWorkflowColumnIds(board?.workflowColumnIds);
    const closedIndex = board?.closedColumnId
      ? workflowColumnIds.findIndex((id) => id === board.closedColumnId)
      : -1;
    const nextWorkflowColumnIds = [...workflowColumnIds];

    if (closedIndex >= 0) {
      nextWorkflowColumnIds.splice(closedIndex, 0, column.id);
    } else {
      nextWorkflowColumnIds.push(column.id);
    }

    await tx.board.update({
      where: { id: boardId },
      data: {
        workflowColumnIds: JSON.stringify(nextWorkflowColumnIds),
      },
    });

    await touchProjectByBoardId(boardId);

    return column;
  });
};

export const updateColumn = async (
  userId: string,
  columnId: string,
  data: { name?: string; wipLimit?: number | null },
  globalRole?: string,
): Promise<Column> => {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    select: { boardId: true },
  });

  if (!column) {
    throw new Error('Column not found');
  }

  await verifyAdmin(userId, column.boardId, globalRole);

  const updated = await prisma.column.update({
    where: { id: columnId },
    data: {
      name: data.name,
      wipLimit: data.wipLimit,
    },
  });

  await touchProjectByBoardId(column.boardId);

  return updated;
};

export const deleteColumn = async (
  userId: string,
  columnId: string,
  globalRole?: string,
): Promise<void> => {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    select: { boardId: true, order: true },
  });

  if (!column) {
    throw new Error('Column not found');
  }

  const storyBoard = await prisma.board.findUnique({
    where: { id: column.boardId },
    select: { storyColumnId: true },
  });

  if (storyBoard?.storyColumnId === columnId || column.order === 0) {
    throw new Error('Stories column must stay first');
  }

  await verifyAdmin(userId, column.boardId, globalRole);

  const workflowBoard = await prisma.board.findUnique({
    where: { id: column.boardId },
    select: {
      storyColumnId: true,
      workflowColumnIds: true,
      resolvedColumnId: true,
      closedColumnId: true,
    },
  });

  if (workflowBoard?.storyColumnId === columnId) {
    throw new Error('Stories column cannot be deleted');
  }

  await prisma.$transaction([
    prisma.board.update({
      where: { id: column.boardId },
      data: {
        workflowColumnIds: JSON.stringify(
          ((workflowBoard?.workflowColumnIds
            ? JSON.parse(workflowBoard.workflowColumnIds)
            : []) as string[]).filter((id) => id !== columnId),
        ),
        resolvedColumnId:
          workflowBoard?.resolvedColumnId === columnId ? null : undefined,
        closedColumnId:
          workflowBoard?.closedColumnId === columnId ? null : undefined,
      },
    }),
    prisma.column.delete({
      where: { id: columnId },
    }),
    prisma.column.updateMany({
      where: {
        boardId: column.boardId,
        order: { gt: column.order },
      },
      data: {
        order: { decrement: 1 },
      },
    }),
  ]);

  await touchProjectByBoardId(column.boardId);
};

export const reorderColumn = async (
  userId: string,
  columnId: string,
  direction: 'left' | 'right',
  globalRole?: string,
): Promise<void> => {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    select: { boardId: true, order: true },
  });

  if (!column) {
    throw new Error('Column not found');
  }

  await verifyAdmin(userId, column.boardId, globalRole);

  const targetOrder =
    direction === 'left' ? column.order - 1 : column.order + 1;

  const neighbor = await prisma.column.findFirst({
    where: { boardId: column.boardId, order: targetOrder },
  });

  if (!neighbor) {
    throw new Error('No adjacent column to swap with in that direction');
  }

  const storyBoard = await prisma.board.findUnique({
    where: { id: column.boardId },
    select: { storyColumnId: true },
  });

  if (neighbor.id === storyBoard?.storyColumnId || neighbor.order === 0) {
    throw new Error('Stories column must stay first');
  }

  await prisma.$transaction([
    prisma.column.update({
      where: { id: columnId },
      data: { order: targetOrder },
    }),
    prisma.column.update({
      where: { id: neighbor.id },
      data: { order: column.order },
    }),
  ]);

  await touchProjectByBoardId(column.boardId);
};
