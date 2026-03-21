import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import { createComment } from '../../src/controllers/comment.controller';
import { makeComment } from '../../src/services/comment.service';
import { logAct } from '../../src/services/audit.service';

vi.mock('../../src/utils/prisma', () => ({
  default: pMock,
}));

vi.mock('../../src/services/comment.service', () => ({
  makeComment: vi.fn(),
}));

vi.mock('../../src/services/audit.service', () => ({
  logAct: vi.fn(),
}));

type TestAuthRequest = Request & {
  user?: {
    id: string;
    globalRole: 'USER' | 'GLOBAL_ADMIN';
  };
};

const setupTestApp = (
  globalRole: 'USER' | 'GLOBAL_ADMIN',
  userId = 'user-123',
): express.Express => {
  const app = express();
  app.use(express.json());

  const mockAuth = (
    req: TestAuthRequest,
    _res: Response,
    next: NextFunction,
  ): void => {
    req.user = { id: userId, globalRole };
    next();
  };

  app.post('/api/comments', mockAuth, createComment);
  return app;
};

describe('Comment Controller - POST /comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  it('returns 403 Forbidden if the user is only a PROJECT_VIEWER', async () => {
    pMock.task.findUnique.mockResolvedValue({
      board: { projectId: 'proj-1' },
    } as unknown as NonNullable<
      Awaited<ReturnType<typeof pMock.task.findUnique>>
    >);

    pMock.projectMember.findUnique.mockResolvedValue({
      role: 'PROJECT_VIEWER',
    } as unknown as NonNullable<
      Awaited<ReturnType<typeof pMock.projectMember.findUnique>>
    >);

    const app = setupTestApp('USER');

    const response = await request(app)
      .post('/api/comments')
      .send({ content: 'Trying to comment...', taskId: 'task-1' });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Viewers cannot add comments');
    expect(makeComment).not.toHaveBeenCalled();
    expect(logAct).not.toHaveBeenCalled();
  });

  it('returns 201 and creates the comment if the user is a PROJECT_MEMBER', async () => {
    pMock.task.findUnique.mockResolvedValue({
      board: { projectId: 'proj-1' },
    } as unknown as NonNullable<
      Awaited<ReturnType<typeof pMock.task.findUnique>>
    >);

    pMock.projectMember.findUnique.mockResolvedValue({
      role: 'PROJECT_MEMBER',
    } as unknown as NonNullable<
      Awaited<ReturnType<typeof pMock.projectMember.findUnique>>
    >);

    const mockCommentData = {
      id: 'comment-1',
      content: 'This is a valid comment',
      taskId: 'task-1',
      authorId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(makeComment).mockResolvedValue(
      mockCommentData as unknown as Awaited<ReturnType<typeof makeComment>>,
    );

    const app = setupTestApp('USER');

    const response = await request(app)
      .post('/api/comments')
      .send({ content: 'This is a valid comment', taskId: 'task-1' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      ...mockCommentData,
      createdAt: mockCommentData.createdAt.toISOString(),
      updatedAt: mockCommentData.updatedAt.toISOString(),
    });

    expect(makeComment).toHaveBeenCalledTimes(1);
    expect(logAct).toHaveBeenCalledWith(
      'task-1',
      'user-123',
      'COMMENT_ADDED',
      undefined,
      'This is a valid comment',
    );
  });

  it('returns 404 if the task being commented on does not exist', async () => {
    pMock.task.findUnique.mockResolvedValue(null);

    const app = setupTestApp('USER');

    const response = await request(app)
      .post('/api/comments')
      .send({ content: 'Ghost comment', taskId: 'missing-task' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });
});
