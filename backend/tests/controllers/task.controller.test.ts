import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import * as taskService from '../../src/services/task.service';
import * as notificationService from '../../src/services/notification.service';
import * as auditService from '../../src/services/audit.service';
import {
  createTask,
  deleteTask,
  getTaskData,
  updateTaskStatus,
  editTask,
} from '../../src/controllers/task.controller';

vi.mock('../../src/utils/prisma', () => ({
  default: pMock,
}));

vi.mock('../../src/services/task.service', () => ({
  makeTask: vi.fn(),
  removeTask: vi.fn(),
  getData: vi.fn(),
  moveTask: vi.fn(),
  closeTask: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock('../../src/services/notification.service', () => ({
  createNotification: vi.fn(),
}));

vi.mock('../../src/services/audit.service', () => ({
  logAct: vi.fn(),
}));

type GlobalRole = 'USER' | 'GLOBAL_ADMIN';

const buildApp = (
  userId?: string,
  globalRole: GlobalRole = 'USER',
): express.Express => {
  const app = express();
  app.use(express.json());

  const mockAuth = (req: Request, _res: Response, next: NextFunction): void => {
    if (userId) {
      (req as never as { user: { id: string; globalRole: string } }).user = {
        id: userId,
        globalRole,
      };
    }
    next();
  };

  app.post('/api/tasks', mockAuth, createTask);
  app.delete('/api/tasks/:id', mockAuth, deleteTask);
  app.get('/api/tasks/:id', mockAuth, getTaskData);
  app.patch('/api/tasks/:id/status', mockAuth, updateTaskStatus);
  app.patch('/api/tasks/:id', mockAuth, editTask);

  return app;
};

const sampleTask = {
  id: 'task-1',
  title: 'Fix the bug',
  description: null,
  type: 'TASK' as const,
  priority: 'MEDIUM' as const,
  status: 'To Do',
  columnId: 'col-1',
  boardId: 'board-1',
  reporterId: 'user-1',
  assigneeId: null,
  parentId: null,
  dueDate: null,
  isClosed: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Task Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  describe('POST /api/tasks', () => {
    it('creates a task and returns 201', async () => {
      vi.mocked(taskService.makeTask).mockResolvedValue(sampleTask as never);
      vi.mocked(auditService.logAct).mockResolvedValue(undefined);

      const res = await request(buildApp('user-1'))
        .post('/api/tasks')
        .send({ title: 'Fix the bug', columnId: 'col-1', boardId: 'board-1' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Fix the bug');
      expect(auditService.logAct).toHaveBeenCalledWith(
        'task-1',
        'user-1',
        'CREATED',
      );
    });

    it('returns 401 when the request has no user', async () => {
      const res = await request(buildApp())
        .post('/api/tasks')
        .send({ title: 'Sneaky task' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when the assignee is not a project member', async () => {
      vi.mocked(taskService.makeTask).mockRejectedValue(
        new Error('Assignee must be a member of the project'),
      );

      const res = await request(buildApp('user-1'))
        .post('/api/tasks')
        .send({ title: 'Task', assigneeId: 'stranger' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Assignee must be/i);
    });

    it('returns 400 when adding the task would exceed the WIP limit', async () => {
      vi.mocked(taskService.makeTask).mockRejectedValue(
        new Error('WIP limit reached for this column'),
      );

      const res = await request(buildApp('user-1'))
        .post('/api/tasks')
        .send({ title: 'Overflowing task', columnId: 'col-full' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/WIP limit/i);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('deletes a task successfully', async () => {
      vi.mocked(taskService.removeTask).mockResolvedValue(sampleTask as never);

      const res = await request(buildApp('user-1')).delete('/api/tasks/task-1');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Task deleted successfully');
    });

    it('returns 400 when the task still has open subtasks', async () => {
      vi.mocked(taskService.removeTask).mockRejectedValue(
        new Error(
          'Cannot delete: task has subtasks that must be removed first',
        ),
      );

      const res = await request(buildApp('user-1')).delete('/api/tasks/task-1');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/subtasks/i);
    });

    it('returns 400 when the user is not allowed to delete this task', async () => {
      vi.mocked(taskService.removeTask).mockRejectedValue(
        new Error('Forbidden: you do not have permission to delete this task'),
      );

      const res = await request(buildApp('user-1')).delete('/api/tasks/task-1');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('returns task data when the task exists', async () => {
      vi.mocked(taskService.getData).mockResolvedValue(sampleTask as never);

      const res = await request(buildApp('user-1')).get('/api/tasks/task-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('task-1');
    });

    it('returns 404 when the task does not exist', async () => {
      vi.mocked(taskService.getData).mockResolvedValue(null as never);

      const res = await request(buildApp('user-1')).get(
        '/api/tasks/ghost-task',
      );

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /api/tasks/:id/status', () => {
    it('moves a task to a different column', async () => {
      pMock.task.findUnique.mockResolvedValue({
        title: 'Fix the bug',
        assigneeId: null,
        reporterId: 'user-1',
        column: { name: 'To Do' },
      } as never);

      pMock.column.findUnique.mockResolvedValue({
        name: 'In Progress',
      } as never);

      vi.mocked(taskService.moveTask).mockResolvedValue(sampleTask as never);
      vi.mocked(auditService.logAct).mockResolvedValue(undefined);
      vi.mocked(notificationService.createNotification).mockResolvedValue(
        undefined as never,
      );

      pMock.task.findUnique.mockResolvedValueOnce({
        title: 'Fix the bug',
        assigneeId: null,
        reporterId: 'user-1',
        column: { name: 'To Do' },
      } as never);
      pMock.task.findUnique.mockResolvedValueOnce({
        board: { name: 'Main', project: { name: 'Proj' } },
      } as never);

      const res = await request(buildApp('user-1'))
        .patch('/api/tasks/task-1/status')
        .send({ targetColumnId: 'col-2' });

      expect(res.status).toBe(200);
    });

    it('returns 404 when the task being moved is not found', async () => {
      pMock.task.findUnique.mockResolvedValue(null);

      const res = await request(buildApp('user-1'))
        .patch('/api/tasks/task-1/status')
        .send({ targetColumnId: 'col-2' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('returns 404 when the target column does not exist', async () => {
      pMock.task.findUnique.mockResolvedValue({
        title: 'Fix the bug',
        assigneeId: null,
        reporterId: 'user-1',
        column: { name: 'To Do' },
      } as never);

      pMock.column.findUnique.mockResolvedValue(null);

      const res = await request(buildApp('user-1'))
        .patch('/api/tasks/task-1/status')
        .send({ targetColumnId: 'col-missing' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Target column not found');
    });

    it('closes a task when close: true is sent', async () => {
      pMock.task.findUnique.mockResolvedValueOnce({
        title: 'Fix the bug',
        assigneeId: null,
        reporterId: 'user-1',
        column: { name: 'In Progress' },
      } as never);

      pMock.task.findUnique.mockResolvedValueOnce({
        board: { name: 'Main', project: { name: 'Proj' } },
      } as never);

      vi.mocked(taskService.closeTask).mockResolvedValue(sampleTask as never);
      vi.mocked(auditService.logAct).mockResolvedValue(undefined);

      const res = await request(buildApp('user-1'))
        .patch('/api/tasks/task-1/status')
        .send({ close: true });

      expect(res.status).toBe(200);
    });

    it('returns 400 when neither targetColumnId nor close is provided', async () => {
      const res = await request(buildApp('user-1'))
        .patch('/api/tasks/task-1/status')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/targetColumnId/i);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('updates an editable task field', async () => {
      pMock.task.findUnique.mockResolvedValue({
        assigneeId: null,
        assignee: null,
      } as never);

      vi.mocked(taskService.updateTask).mockResolvedValue({
        ...sampleTask,
        title: 'Updated title',
      } as never);

      const res = await request(buildApp('user-1'))
        .patch('/api/tasks/task-1')
        .send({ title: 'Updated title' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated title');
    });

    it('returns 400 when a forbidden edit is attempted', async () => {
      pMock.task.findUnique.mockResolvedValue({
        assigneeId: null,
        assignee: null,
      } as never);

      vi.mocked(taskService.updateTask).mockRejectedValue(
        new Error('Forbidden: you cannot edit this task'),
      );

      const res = await request(buildApp('user-1'))
        .patch('/api/tasks/task-1')
        .send({ title: 'Blocked' });

      expect(res.status).toBe(400);
    });
  });
});
