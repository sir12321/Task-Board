import prisma from '../utils/prisma';
import { Column } from '@prisma/client';

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

  return prisma.column.create({
    data: {
      name,
      wipLimit,
      order: newOrder,
      boardId,
    },
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

  return prisma.column.update({
    where: { id: columnId },
    data: {
      name: data.name,
      wipLimit: data.wipLimit,
    },
  });
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

  await verifyAdmin(userId, column.boardId, globalRole);

  await prisma.$transaction([
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
};
