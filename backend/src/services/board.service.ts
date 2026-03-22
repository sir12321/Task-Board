import p from '../utils/prisma';
import { Board, Column, Task, Comment } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  getFallbackWorkflowColumnIds,
  getWorkflowStep,
  parseWorkflowColumnIds,
  type BoardWorkflowConfig,
  validateWorkflowConfig,
} from '../utils/workflow.util';
import { touchProject } from '../utils/touchProject.util';

type TaskWithColumnName = Task & { comments: Comment[]; columnName: string };

type BoardResponse = Omit<Board, 'workflowColumnIds'> & {
  columns: Column[];
  tasks: TaskWithColumnName[];
  workflowColumnIds: string[];
};

export const getBoards = async (
  boardId: string,
): Promise<BoardResponse | null> => {
  const board = await p.board.findUnique({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { order: 'asc' },
      },
      tasks: {
        include: {
          column: { select: { name: true, order: true } },
          assignee: { select: { name: true, avatarUrl: true } },
          reporter: { select: { name: true, avatarUrl: true } },
          parent: { select: { title: true } },
          comments: {
            include: {
              author: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  });

  if (!board) return null;

  const workflow: BoardWorkflowConfig = {
    storyColumnId: board.storyColumnId,
    workflowColumnIds: getFallbackWorkflowColumnIds({
      workflowColumnIds: parseWorkflowColumnIds(board.workflowColumnIds),
      todoColumnId: board.todoColumnId,
      inProgressColumnId: board.inProgressColumnId,
      resolvedColumnId: board.resolvedColumnId,
      closedColumnId: board.closedColumnId,
    }),
    resolvedColumnId: board.resolvedColumnId,
    closedColumnId: board.closedColumnId,
  };

  // We need to figure out the lowest workflow step among all children of a Story
  // so the Story's own status can automatically reflect the progress of its tasks.
  const minChild = new Map<string, { name: string; step: number }>();

  for (const task of board.tasks) {
    if (!task.parentId) {
      continue;
    }

    const existing = minChild.get(task.parentId);

    const step = getWorkflowStep(workflow, task.columnId);
    const comparableStep = step >= 0 ? step : Number.MAX_SAFE_INTEGER;

    if (!existing || comparableStep < existing.step) {
      minChild.set(task.parentId, {
        name: task.column.name,
        step: comparableStep,
      });
    }
  }

  return {
    ...board,
    workflowColumnIds: workflow.workflowColumnIds,
    tasks: board.tasks.map((task) => {
      const { column, assignee, reporter, parent, comments, ...rest } = task;
      const todoColumnName =
        board.columns.find(
          (candidate) => candidate.id === workflow.workflowColumnIds[0],
        )
          ?.name ?? 'To Do';
      const fallbackStoryStatus = minChild.get(task.id)?.name ?? todoColumnName;

      return {
        ...rest,
        columnName: column.name,
        assigneeName: assignee?.name || null,
        assigneeAvatarUrl: assignee?.avatarUrl || null,
        reporterName: reporter?.name || 'Unknown',
        reporterAvatarUrl: reporter?.avatarUrl || null,
        parentName: parent?.title || null,
        status: rest.type === 'STORY' ? fallbackStoryStatus : column.name,
        comments: comments.map((comment) => {
          const { author, ...commentRest } = comment;
          return {
            ...commentRest,
            authorName: author.name,
            authorAvatarUrl: author.avatarUrl || null,
          };
        }),
      };
    }),
  };
};

export const createBoard = async (
  projectId: string,
  name: string,
  workflow?: BoardWorkflowConfig,
): Promise<Board> => {
  const DEFAULT_COLUMNS = [
    { name: 'Stories', order: 0, wipLimit: null },
    { name: 'To Do', order: 1, wipLimit: null },
    { name: 'In Progress', order: 2, wipLimit: 3 },
    { name: 'Review', order: 3, wipLimit: 3 },
    { name: 'Done', order: 4, wipLimit: null },
  ];
  const columnIds = DEFAULT_COLUMNS.map(() => randomUUID());
  const columnsToCreate = DEFAULT_COLUMNS.map((column, index) => ({
    id: columnIds[index],
    ...column,
    boardId: '',
  }));

  const defaultWorkflow: BoardWorkflowConfig = {
    storyColumnId: columnIds[0],
    workflowColumnIds: [columnIds[1], columnIds[2], columnIds[3], columnIds[4]],
    resolvedColumnId: columnIds[3],
    closedColumnId: columnIds[4],
  };

  const nextWorkflow = workflow ?? defaultWorkflow;
  validateWorkflowConfig(nextWorkflow, columnIds);

  return p.$transaction(async (tx) => {
    const board = await tx.board.create({
      data: {
        name,
        projectId,
        storyColumnId: nextWorkflow.storyColumnId,
        workflowColumnIds: JSON.stringify(nextWorkflow.workflowColumnIds),
        resolvedColumnId: nextWorkflow.resolvedColumnId,
        closedColumnId: nextWorkflow.closedColumnId,
      },
    });

    await Promise.all(
      columnsToCreate.map((column) =>
        tx.column.create({
          data: {
            ...column,
            boardId: board.id,
          },
        }),
      ),
    );

    await touchProject(projectId);

    return board;
  });
};

const verifyBoardAdmin = async (
  userId: string,
  boardId: string,
  globalRole?: string,
): Promise<void> => {
  if (globalRole === 'GLOBAL_ADMIN') {
    return;
  }

  const board = await p.board.findUnique({
    where: { id: boardId },
    select: { projectId: true },
  });

  if (!board) {
    throw new Error('Board not found');
  }

  const member = await p.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId: board.projectId,
      },
    },
    select: { role: true },
  });

  if (!member || member.role !== 'PROJECT_ADMIN') {
    throw new Error('Forbidden: Only project admins can edit board workflow');
  }
};

export const updateBoardWorkflow = async (
  userId: string,
  boardId: string,
  workflow: BoardWorkflowConfig,
  globalRole?: string,
): Promise<Board> => {
  await verifyBoardAdmin(userId, boardId, globalRole);

  const columns = await p.column.findMany({
    where: { boardId },
    select: { id: true },
  });

  validateWorkflowConfig(
    workflow,
    columns.map((column) => column.id),
  );

  const board = await p.board.update({
    where: { id: boardId },
    data: {
      storyColumnId: workflow.storyColumnId,
      workflowColumnIds: JSON.stringify(workflow.workflowColumnIds),
      resolvedColumnId: workflow.resolvedColumnId,
      closedColumnId: workflow.closedColumnId,
    },
  });

  const boardWithProject = await p.board.findUnique({
    where: { id: boardId },
    select: { projectId: true },
  });
  if (boardWithProject) {
    await touchProject(boardWithProject.projectId);
  }

  return board;
};

export const verifyCreationPermission = async (
  userId: string,
  projectId: string,
  globalRole?: string,
): Promise<void> => {
  if (globalRole === 'GLOBAL_ADMIN') {
    return;
  }

  const member = await p.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    select: { role: true },
  });

  if (!member) {
    throw new Error('Forbidden: You are not a member of this project');
  }

  if (member.role !== 'PROJECT_ADMIN') {
    throw new Error('Forbidden: Only project admins can create boards');
  }
};
