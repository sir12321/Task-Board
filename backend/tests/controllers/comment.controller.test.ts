import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import {
  createComment,
  removeComment,
  updateComment,
} from '../../src/controllers/comment.controller';
import {
  makeComment,
  deleteComment,
  editComment,
} from '../../src/services/comment.service';
import { logAct } from '../../src/services/audit.service';

vi.mock('../../src/utils/prisma', () => ({
  default: pMock,
}));

vi.mock('../../src/services/comment.service', () => ({
  makeComment: vi.fn(),
  deleteComment: vi.fn(),
  editComment: vi.fn(),
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
  app.delete('/api/comments/:commentId', mockAuth, removeComment);
  app.put('/api/comments/:commentId', mockAuth, updateComment);
  return app;
};

const setupUnauthApp = (): express.Express => {
  const app = express();
  app.use(express.json());
  app.delete('/api/comments/:commentId', removeComment);
  app.put('/api/comments/:commentId', updateComment);
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

describe('Comment Controller - DELETE /comments/:commentId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  it('deletes a comment and returns 200', async () => {
    pMock.comment.findUnique.mockResolvedValue({
      id: 'comment-1',
      content: 'Old content',
      taskId: 'task-1',
    } as never);
    vi.mocked(deleteComment).mockResolvedValue(undefined as never);
    vi.mocked(logAct).mockResolvedValue(undefined);

    const app = setupTestApp('USER');
    const response = await request(app).delete('/api/comments/comment-1');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Comment deleted successfully');
    expect(deleteComment).toHaveBeenCalledWith('comment-1', 'user-123', 'USER');
    expect(logAct).toHaveBeenCalledWith(
      'task-1',
      'user-123',
      'COMMENT_DELETED',
      'Old content',
      undefined,
    );
  });

  it('returns 401 when the request has no user', async () => {
    const app = setupUnauthApp();
    const response = await request(app).delete('/api/comments/comment-1');
    expect(response.status).toBe(401);
  });

  it('returns 404 when the comment does not exist', async () => {
    pMock.comment.findUnique.mockResolvedValue(null);

    const app = setupTestApp('USER');
    const response = await request(app).delete('/api/comments/missing');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Comment not found');
  });

  it('returns 403 when the user is not the comment author', async () => {
    pMock.comment.findUnique.mockResolvedValue({
      id: 'comment-1',
      content: 'content',
      taskId: 'task-1',
    } as never);
    vi.mocked(deleteComment).mockRejectedValue(
      new Error('Unauthorized: You can only delete your own comments'),
    );

    const app = setupTestApp('USER');
    const response = await request(app).delete('/api/comments/comment-1');

    expect(response.status).toBe(403);
  });

  it('returns 400 on generic service failure', async () => {
    pMock.comment.findUnique.mockResolvedValue({
      id: 'comment-1',
      content: 'content',
      taskId: 'task-1',
    } as never);
    vi.mocked(deleteComment).mockRejectedValue(new Error('DB error'));

    const app = setupTestApp('USER');
    const response = await request(app).delete('/api/comments/comment-1');

    expect(response.status).toBe(400);
  });
});

describe('Comment Controller - PUT /comments/:commentId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  it('updates a comment and returns 200', async () => {
    pMock.comment.findUnique.mockResolvedValue({
      id: 'comment-1',
      content: 'Old content',
      taskId: 'task-1',
    } as never);
    vi.mocked(editComment).mockResolvedValue({
      id: 'comment-1',
      content: 'New content',
    } as never);
    vi.mocked(logAct).mockResolvedValue(undefined);

    const app = setupTestApp('USER');
    const response = await request(app)
      .put('/api/comments/comment-1')
      .send({ content: 'New content' });

    expect(response.status).toBe(200);
    expect(response.body.content).toBe('New content');
    expect(editComment).toHaveBeenCalledWith(
      'comment-1',
      'user-123',
      'New content',
      'USER',
    );
    expect(logAct).toHaveBeenCalledWith(
      'task-1',
      'user-123',
      'COMMENT_EDITED',
      'Old content',
      'New content',
    );
  });

  it('returns 401 when the request has no user', async () => {
    const app = setupUnauthApp();
    const response = await request(app)
      .put('/api/comments/comment-1')
      .send({ content: 'New content' });
    expect(response.status).toBe(401);
  });

  it('returns 400 when content is missing', async () => {
    const app = setupTestApp('USER');
    const response = await request(app)
      .put('/api/comments/comment-1')
      .send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing required fields');
  });

  it('returns 404 when the comment does not exist', async () => {
    pMock.comment.findUnique.mockResolvedValue(null);

    const app = setupTestApp('USER');
    const response = await request(app)
      .put('/api/comments/missing')
      .send({ content: 'New content' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Comment not found');
  });

  it('returns 403 when the user is not the author', async () => {
    pMock.comment.findUnique.mockResolvedValue({
      id: 'comment-1',
      content: 'Old',
      taskId: 'task-1',
    } as never);
    vi.mocked(editComment).mockRejectedValue(
      new Error('Unauthorized: You can only edit your own comments'),
    );

    const app = setupTestApp('USER');
    const response = await request(app)
      .put('/api/comments/comment-1')
      .send({ content: 'Hijacked' });

    expect(response.status).toBe(403);
  });

  it('returns 400 when content is empty', async () => {
    pMock.comment.findUnique.mockResolvedValue({
      id: 'comment-1',
      content: 'Old',
      taskId: 'task-1',
    } as never);
    vi.mocked(editComment).mockRejectedValue(
      new Error('Comment content cannot be empty'),
    );

    const app = setupTestApp('USER');
    const response = await request(app)
      .put('/api/comments/comment-1')
      .send({ content: 'x' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/cannot be empty/i);
  });
});
