import { Response } from 'express';
import {
  makeTask,
  moveTask,
  removeTask,
  getData,
} from '../services/task.service';
import { AuthRequest } from './auth.controller';
import { createNotification } from '../services/notification.service';
import { logAct } from '../services/audit.service';
import prisma from '../utils/prisma';

const notifyStatusChange = async (
  taskId: string,
  task: {
    title: string;
    assigneeId: string | null;
    reporterId: string;
  },
  fromStatus: string,
  toStatus: string,
  actorUserId?: string,
): Promise<void> => {
  const recipientIds = new Set<string>();
  if (task.assigneeId) {
    recipientIds.add(task.assigneeId);
  }
  if (task.reporterId) {
    recipientIds.add(task.reporterId);
  }

  if (actorUserId) {
    // Does not notify the person who actually made the change.
    recipientIds.delete(actorUserId);
  }

  if (recipientIds.size === 0) {
    return;
  }

  const boardContext = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      board: {
        select: {
          name: true,
          project: { select: { name: true } },
        },
      },
    },
  });

  const scope = boardContext
    ? ` [Project: ${boardContext.board.project.name} | Board: ${boardContext.board.name} | Column: ${toStatus}]`
    : '';

  await Promise.all(
    Array.from(recipientIds).map((userId) =>
      createNotification(
        userId,
        `Status changed on task "${task.title}": ${fromStatus} -> ${toStatus}${scope}`,
      ),
    ),
  );
};

export const createTask = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const reporterId = req.user?.id;
    const globalRole = req.user?.globalRole;

    if (!reporterId || typeof reporterId != 'string') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const task = await makeTask(req.body, reporterId, globalRole);
    await logAct(task.id, reporterId, 'CREATED');
    res.status(201).json(task);
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (
        err.message.includes('Assignee must be') ||
        err.message.includes('Forbidden') ||
        err.message.includes('WIP limit')
      ) {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to create task' });
  }
};

export const deleteTask = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const id = req.params.id;
    const userId = req.user?.id;
    const globalRole = req.user?.globalRole;

    if (!id || typeof id != 'string' || !userId) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }

    await removeTask(id, userId, globalRole);
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (
        err.message.includes('Forbidden') ||
        err.message.includes('subtasks')
      ) {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

export const updateTaskStatus = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const id = req.params.id;
    const userId = req.user?.id;
    const globalRole = req.user?.globalRole;
    const { targetColumnId, close } = req.body;

    if (!id || typeof id !== 'string' || !userId) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }

    if (close === true) {
      const beforeTask = await prisma.task.findUnique({
        where: { id },
        select: {
          title: true,
          assigneeId: true,
          reporterId: true,
          column: { select: { name: true } },
        },
      });

      if (!beforeTask) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const { closeTask } = await import('../services/task.service');
      const task = await closeTask(id, userId, globalRole);
      await notifyStatusChange(
        id,
        {
          title: beforeTask.title,
          assigneeId: beforeTask.assigneeId,
          reporterId: beforeTask.reporterId,
        },
        beforeTask.column.name,
        'Closed',
        userId,
      );
      await logAct(
        id,
        userId,
        'STATUS_CHANGED',
        beforeTask.column.name,
        'Closed',
      );
      res.status(200).json(task);
      return;
    }

    if (targetColumnId && typeof targetColumnId === 'string') {
      const beforeTask = await prisma.task.findUnique({
        where: { id },
        select: {
          title: true,
          assigneeId: true,
          reporterId: true,
          column: { select: { name: true } },
        },
      });

      if (!beforeTask) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const toColumn = await prisma.column.findUnique({
        where: { id: targetColumnId },
        select: { name: true },
      });

      if (!toColumn) {
        res.status(404).json({ error: 'Target column not found' });
        return;
      }

      const task = await moveTask(id, targetColumnId, userId, globalRole);
      await notifyStatusChange(
        id,
        {
          title: beforeTask.title,
          assigneeId: beforeTask.assigneeId,
          reporterId: beforeTask.reporterId,
        },
        beforeTask.column.name,
        toColumn.name,
        userId,
      );
      await logAct(
        id,
        userId,
        'STATUS_CHANGED',
        beforeTask.column.name,
        toColumn.name,
      );
      res.status(200).json(task);
      return;
    }

    res.status(400).json({
      error:
        'Provide either `targetColumnId` for move or `close: true` for close',
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (
        err.message.includes('Target column not found') ||
        err.message.includes('Invalid transition') ||
        err.message.includes('WIP limit') ||
        err.message.includes('Forbidden') ||
        err.message.includes('incomplete subtasks')
      ) {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to update task status' });
  }
};

export const editTask = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const id = req.params.id;
    const userId = req.user?.id;
    const globalRole = req.user?.globalRole;

    if (!id || typeof id != 'string' || !userId) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }

    const {
      title,
      description,
      type,
      priority,
      dueDate,
      assigneeId,
      parentId,
    } = req.body;

    const oldTask = await prisma.task.findUnique({
      where: { id },
      select: {
        assigneeId: true,
        assignee: {
          select: { name: true },
        },
      },
    });

    const { updateTask } = await import('../services/task.service');

    const task = await updateTask(
      id,
      { title, description, type, priority, dueDate, assigneeId, parentId },
      userId,
      globalRole,
    );

    if (
      oldTask &&
      assigneeId !== undefined &&
      oldTask.assigneeId !== assigneeId
    ) {
      let newAssigneeLabel = 'Unassigned';

      if (assigneeId) {
        const assigneeUser = await prisma.user.findUnique({
          where: { id: assigneeId },
          select: { name: true },
        });
        newAssigneeLabel = assigneeUser?.name || assigneeId;
      }

      const oldAssigneeLabel =
        oldTask.assignee?.name || oldTask.assigneeId || 'Unassigned';

      await logAct(
        id,
        userId,
        'ASSIGNEE_CHANGED',
        oldAssigneeLabel,
        newAssigneeLabel,
      );
    }

    res.status(200).json(task);
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (
        err.message.includes('Forbidden') ||
        err.message.includes('Assignee must be')
      ) {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const getTaskData = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const id = req.params.id;

    if (!id || typeof id != 'string') {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }

    const task = await getData(id);

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.status(200).json(task);
  } catch {
    res.status(500).json({ error: 'Failed to fetch task data' });
  }
};
