import prisma from '../utils/prisma';
import { TaskType, Priority, Task } from '@prisma/client';
import { createNotification } from './notification.service';
import {
  getFallbackWorkflowColumnIds,
  getWorkflowStep,
  isClosedColumn,
  isResolvedColumn,
  parseWorkflowColumnIds,
} from '../utils/workflow.util';

const verifyTaskPermissions = async (
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

const getBoardWorkflow = async (boardId: string) =>
  prisma.board.findUnique({
    where: { id: boardId },
    select: {
      storyColumnId: true,
      workflowColumnIds: true,
      todoColumnId: true,
      inProgressColumnId: true,
      resolvedColumnId: true,
      closedColumnId: true,
    },
  });

const checkStoryChildren = async (taskId: string): Promise<void> => {
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

const isTaskLockedInClosedColumn = async (
  boardId: string,
  columnId: string,
): Promise<boolean> => {
  const workflow = await getBoardWorkflow(boardId);

  if (!workflow) {
    throw new Error('Board not found');
  }

  return workflow.closedColumnId === columnId;
};

const validateAssignableMember = async (
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

export const makeTask = async (
  data: {
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
  },
  userId: string,
  globalRole?: string,
): Promise<Task> => {
  await verifyTaskPermissions(userId, data.boardId, globalRole);

  if (data.assigneeId) {
    await validateAssignableMember(data.boardId, data.assigneeId);
  }

  await checkWipLimit(data.columnId);
  const workflow = await getBoardWorkflow(data.boardId);
  if (!workflow) {
    throw new Error('Board not found');
  }

  const normalizedWorkflow = {
    ...workflow,
    workflowColumnIds: getFallbackWorkflowColumnIds({
      workflowColumnIds: parseWorkflowColumnIds(workflow.workflowColumnIds),
      todoColumnId: workflow.todoColumnId,
      inProgressColumnId: workflow.inProgressColumnId,
      resolvedColumnId: workflow.resolvedColumnId,
      closedColumnId: workflow.closedColumnId,
    }),
  };

  if (data.type === 'STORY' && normalizedWorkflow.storyColumnId !== data.columnId) {
    throw new Error('STORY tasks can only be created in the Stories column');
  }

  if (data.type !== 'STORY' && normalizedWorkflow.storyColumnId === data.columnId) {
    throw new Error('Only STORY tasks can be created in the Stories column');
  }

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
      resolvedAt: isResolvedColumn(normalizedWorkflow, data.columnId) ? new Date() : null,
      closedAt: isClosedColumn(normalizedWorkflow, data.columnId) ? new Date() : null,
    },
  });

  if (data.assigneeId) {
    const taskContext = await prisma.task.findUnique({
      where: { id: task.id },
      select: {
        column: { select: { name: true } },
        board: {
          select: {
            name: true,
            project: { select: { name: true } },
          },
        },
      },
    });

    const scope = taskContext
      ? ` [Project: ${taskContext.board.project.name} | Board: ${taskContext.board.name} | Column: ${taskContext.column.name}]`
      : '';

    const reporter = await prisma.user.findUnique({
      where: { id: data.reporterId },
      select: { name: true },
    });
    const reporterName = reporter?.name ?? 'Unknown Reporter';

    await createNotification(
      data.assigneeId,
      `You have been assigned to task "${data.title}" by ${reporterName}${scope}`,
    );
  }

  return task;
};

export const moveTask = async (
  id: string,
  cId: string,
  userId: string,
  globalRole?: string,
): Promise<Task> => {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      column: true,
      board: {
        select: {
          id: true,
          storyColumnId: true,
          workflowColumnIds: true,
          todoColumnId: true,
          inProgressColumnId: true,
          resolvedColumnId: true,
          closedColumnId: true,
        },
      },
    },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  if (await isTaskLockedInClosedColumn(task.boardId, task.columnId)) {
    throw new Error(
      'Forbidden: Task is closed and locked from further modifications',
    );
  }

  await verifyTaskPermissions(userId, task.boardId, globalRole);

  const targetCol = await prisma.column.findUnique({
    where: { id: cId },
  });

  if (!targetCol) {
    throw new Error('Target column not found');
  }

  const workflow = {
    ...task.board,
    workflowColumnIds: getFallbackWorkflowColumnIds({
      workflowColumnIds: parseWorkflowColumnIds(task.board.workflowColumnIds),
      todoColumnId: task.board.todoColumnId,
      inProgressColumnId: task.board.inProgressColumnId,
      resolvedColumnId: task.board.resolvedColumnId,
      closedColumnId: task.board.closedColumnId,
    }),
  };

  if (task.type === 'STORY') {
    if (workflow.storyColumnId !== cId) {
      throw new Error('Stories must remain in the configured Stories column');
    }
  } else {
    if (workflow.storyColumnId === cId) {
      throw new Error('Only stories can move into the Stories column');
    }

    const currentStep = getWorkflowStep(workflow, task.columnId);
    const targetStep = getWorkflowStep(workflow, cId);

    if (currentStep < 0 || targetStep < 0 || targetStep - currentStep !== 1) {
      throw new Error(
        'Invalid Transition: Tasks can only be moved to the next workflow stage',
      );
    }

    await checkWipLimit(cId);
  }

  if (isResolvedColumn(workflow, cId)) {
    await checkStoryChildren(id);
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      columnId: cId,
      resolvedAt: isResolvedColumn(workflow, cId)
        ? task.resolvedAt || new Date()
        : null,
      closedAt: isClosedColumn(workflow, cId) ? new Date() : null,
    },
  });

  return updatedTask;
};

export const removeTask = async (
  id: string,
  userId: string,
  globalRole?: string,
): Promise<Task> => {
  const task = await prisma.task.findUnique({
    where: { id },
    select: { boardId: true, columnId: true },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  if (await isTaskLockedInClosedColumn(task.boardId, task.columnId)) {
    throw new Error(
      'Forbidden: Task is closed and locked from further modifications',
    );
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

export const closeTask = async (
  id: string,
  userId: string,
  globalRole?: string,
): Promise<Task> => {
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
  globalRole?: string,
): Promise<Task> => {
  const task = await prisma.task.findUnique({
    where: { id },
    select: {
      boardId: true,
      columnId: true,
      assigneeId: true,
      type: true,
      reporterId: true,
    },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  if (await isTaskLockedInClosedColumn(task.boardId, task.columnId)) {
    throw new Error(
      'Forbidden: Task is closed and locked from further modifications',
    );
  }

  await verifyTaskPermissions(userId, task.boardId, globalRole);

  if (data.assigneeId !== undefined && data.assigneeId !== task.assigneeId) {
    if (data.assigneeId) {
      await validateAssignableMember(task.boardId, data.assigneeId);
    }
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      type: data.type,
      priority: data.priority,
      dueDate: data.dueDate
        ? new Date(data.dueDate)
        : data.dueDate === null
          ? null
          : undefined,
      assigneeId: data.assigneeId,
      parentId: data.parentId,
    },
  });

  if (
    data.assigneeId &&
    data.assigneeId !== task.assigneeId &&
    data.assigneeId !== userId
  ) {
    const taskContext = await prisma.task.findUnique({
      where: { id },
      select: {
        column: { select: { name: true } },
        board: {
          select: {
            name: true,
            project: { select: { name: true } },
          },
        },
      },
    });

    const scope = taskContext
      ? ` [Project: ${taskContext.board.project.name} | Board: ${taskContext.board.name} | Column: ${taskContext.column.name}]`
      : '';

    await createNotification(
      data.assigneeId,
      `Your assigned task has been updated: ${updatedTask.title}${scope}`,
    );
  }

  return updatedTask;
};

export const getData = async (id: string): Promise<Task> => {
  const data = await prisma.task.findUnique({
    where: { id },
    include: {
      comments: true,
      auditLogs: {
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { name: true, avatarUrl: true },
          },
        },
      },
    },
  });
  if (!data) {
    throw new Error('Task not found');
  }
  return data;
};
