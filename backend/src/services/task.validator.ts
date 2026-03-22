import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

export const verifyTaskPermissions = async (
  userId: string,
  boardId: string,
  globalRole?: string,
): Promise<void> => {
  if (globalRole === 'GLOBAL_ADMIN') {
    return;
  }

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

  if (!member) {
    throw new Error('Forbidden: You are not a member of this project');
  }

  if (member.role === 'PROJECT_VIEWER') {
    throw new Error('Forbidden: Viewers cannot modify tasks');
  }
};

export const checkWipLimit = async (columnId: string): Promise<void> => {
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

export type BoardWorkflowRecord = Prisma.BoardGetPayload<{
  select: {
    storyColumnId: true;
    workflowColumnIds: true;
    resolvedColumnId: true;
    closedColumnId: true;
  };
}>;

export const getBoardWorkflow = async (
  boardId: string,
): Promise<BoardWorkflowRecord | null> =>
  prisma.board.findUnique({
    where: { id: boardId },
    select: {
      storyColumnId: true,
      workflowColumnIds: true,
      resolvedColumnId: true,
      closedColumnId: true,
    },
  });

export const checkStoryChildren = async (taskId: string): Promise<void> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { children: true },
  });

  if (task?.type === 'STORY') {
    const incompleteChild = task.children.find(
      (c) => !c.resolvedAt && !c.closedAt,
    );
    if (incompleteChild) {
      throw new Error(
        'Cannot resolve or close a Story with incomplete subtasks',
      );
    }
  }
};

export const isTaskLockedInClosedColumn = async (
  boardId: string,
  columnId: string,
): Promise<boolean> => {
  const workflow = await getBoardWorkflow(boardId);

  if (!workflow) {
    throw new Error('Board not found');
  }

  return workflow.closedColumnId === columnId;
};

export const validateAssignableMember = async (
  boardId: string,
  assigneeId: string,
): Promise<void> => {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { projectId: true },
  });

  if (!board) {
    throw new Error('Board not found');
  }

  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        projectId: board.projectId,
        userId: assigneeId,
      },
    },
    select: { role: true },
  });

  if (!member) {
    throw new Error('Assignee must be a member of the project');
  }

  if (member.role === 'PROJECT_VIEWER') {
    throw new Error('Assignee must be a project admin or project member');
  }
};
