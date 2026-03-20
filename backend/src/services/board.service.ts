import p from '../utils/prisma';
import { Board, Column, Task, Comment } from '@prisma/client';

type TaskWithColumnName = Task & { comments: Comment[]; columnName: string };

type BoardResponse = Board & {
  columns: Column[];
  tasks: TaskWithColumnName[];
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
          assignee: { select: { name: true } },
          reporter: { select: { name: true } },
          parent: { select: { title: true } },
          comments: {
            include: {
              author: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  });

  if (!board) return null;

  const minChild = new Map<string, { name: string; order: number }>();

  for (const task of board.tasks) {
    if (!task.parentId) {
      continue;
    }

    const existing = minChild.get(task.parentId);

    if (!existing || task.column.order < existing.order) {
      minChild.set(task.parentId, {
        name: task.column.name,
        order: task.column.order,
      });
    }
  }

  return {
    ...board,
    tasks: board.tasks.map((task) => {
      const { column, assignee, reporter, parent, comments, ...rest } = task;
      const storyStatus = minChild.get(task.id)?.name ?? column.name;

      return {
        ...rest,
        columnName: column.name,
        assigneeName: assignee?.name || null,
        reporterName: reporter?.name || 'Unknown',
        parentName: parent?.title || null,
        status: rest.type === 'STORY' ? storyStatus : column.name,
        comments: comments.map((comment) => {
          const { author, ...commentRest } = comment;
          return {
            ...commentRest,
            authorName: author.name,
          };
        }),
      };
    }),
  };
};

export const createBoard = async (
  projectId: string,
  name: string,
): Promise<Board> => {
  const DEFAULT_COLUMNS = [
    { name: 'Stories', order: 0, wipLimit: null },
    { name: 'To Do', order: 1, wipLimit: null },
    { name: 'In Progress', order: 2, wipLimit: 3 },
    { name: 'Review', order: 3, wipLimit: 3 },
    { name: 'Done', order: 4, wipLimit: null },
  ];

  const board = await p.board.create({
    data: {
      name,
      projectId,
      columns: {
        create: DEFAULT_COLUMNS,
      },
    },
  });

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
