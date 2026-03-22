import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import app from '../../src/app';

vi.mock('../../src/utils/prisma', () => ({ default: pMock }));

vi.mock('../../src/utils/hash.util', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-pw'),
  comparePasswords: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../src/utils/jwt.util', () => ({
  generateAccessToken: vi.fn().mockReturnValue('test-access-token'),
  generateRefreshToken: vi.fn().mockReturnValue('test-refresh-token'),
  verifyAccessToken: vi.fn().mockReturnValue({
    userId: 'user-1',
    globalRole: 'GLOBAL_ADMIN',
  }),
  verifyRefreshToken: vi.fn().mockReturnValue({ userId: 'user-1' }),
}));

vi.mock('../../src/utils/touchProject.util', () => ({
  touchProjectByBoardId: vi.fn().mockResolvedValue(undefined),
  touchProject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/utils/mention.util', () => ({
  processMentions: vi.fn().mockResolvedValue(undefined),
  resolveMentionedUserIds: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../src/utils/richText.util', () => ({
  sanitizeHtml: vi.fn((s: string) => s),
  stripHtml: vi.fn((s: string) => s),
  correctRichTextComment: vi.fn((s: string) => s),
  getRichTextPlainText: vi.fn((s: string) => s),
  getRichTextNotificationSnippet: vi.fn((s: string) => s),
}));

vi.mock('../../src/services/audit.service', () => ({
  logAct: vi.fn().mockResolvedValue(undefined),
}));

describe('Integration: Auth flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  it('registers a new user, logs in, refreshes, and logs out', async () => {
    pMock.user.findUnique.mockResolvedValueOnce(null);
    pMock.user.count.mockResolvedValue(0);
    pMock.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin',
      avatarUrl: null,
      globalRole: 'GLOBAL_ADMIN',
      password: 'hashed-pw',
      refreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'admin@example.com', password: 'secret', name: 'Admin' });

    expect(regRes.status).toBe(201);
    expect(regRes.body.user.email).toBe('admin@example.com');
    expect(regRes.body.user.globalRole).toBe('GLOBAL_ADMIN');
    expect(regRes.body.user).not.toHaveProperty('password');

    pMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'admin@example.com',
      password: 'hashed-pw',
      globalRole: 'GLOBAL_ADMIN',
    } as never);
    pMock.user.update.mockResolvedValueOnce({} as never);
    pMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin',
      avatarUrl: null,
      globalRole: 'GLOBAL_ADMIN',
      notifications: [],
    } as never);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'secret' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.message).toBe('Login successful');
    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith('accessToken'))).toBe(true);
    expect(cookies.some((c: string) => c.startsWith('refreshToken'))).toBe(true);

    pMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      globalRole: 'GLOBAL_ADMIN',
      refreshToken: 'test-refresh-token',
    } as never);
    pMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Admin',
      email: 'admin@example.com',
      avatarUrl: null,
      globalRole: 'GLOBAL_ADMIN',
      notifications: [],
    } as never);

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=test-refresh-token');

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.message).toBe('Session refreshed successfully');

    pMock.user.update.mockResolvedValueOnce({} as never);

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', 'accessToken=test-access-token');

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('Logout successful');
  });
});

describe('Integration: Project → Board → Column → Task flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  it('creates a project, adds a board, adds a column, and creates a task', async () => {
    pMock.project.create.mockResolvedValue({
      id: 'proj-1',
      name: 'My Project',
      description: null,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    pMock.projectMember.create.mockResolvedValue({} as never);

    const projRes = await request(app)
      .post('/api/projects')
      .set('Cookie', 'accessToken=test-access-token')
      .send({ name: 'My Project' });

    expect(projRes.status).toBe(201);
    expect(projRes.body.name).toBe('My Project');

    pMock.projectMember.findUnique.mockResolvedValue({
      role: 'PROJECT_ADMIN',
    } as never);
    pMock.board.create.mockResolvedValue({
      id: 'board-1',
      name: 'Sprint 1',
      projectId: 'proj-1',
    } as never);
    pMock.column.createMany.mockResolvedValue({ count: 4 } as never);
    pMock.column.findMany.mockResolvedValue([
      { id: 'col-backlog', name: 'Backlog', order: 0 },
      { id: 'col-doing', name: 'Doing', order: 1 },
      { id: 'col-done', name: 'Done', order: 2 },
      { id: 'col-closed', name: 'Closed', order: 3 },
    ] as never);
    pMock.board.update.mockResolvedValue({
      id: 'board-1',
      storyColumnId: 'col-backlog',
      resolvedColumnId: 'col-done',
      closedColumnId: 'col-closed',
    } as never);

    const boardRes = await request(app)
      .post('/api/boards')
      .set('Cookie', 'accessToken=test-access-token')
      .send({ projectId: 'proj-1', name: 'Sprint 1' });

    expect(boardRes.status).toBe(201);

    const fakeCol = {
      id: 'col-new',
      name: 'Review',
      order: 4,
      wipLimit: 3,
      boardId: 'board-1',
    };
    pMock.column.findFirst.mockResolvedValue(null);
    pMock.board.findUnique.mockResolvedValueOnce({
      workflowColumnIds: JSON.stringify([]),
      closedColumnId: null,
    } as never);
    pMock.$transaction.mockImplementation(async (cb: (tx: typeof pMock) => Promise<unknown>) => {
      pMock.column.create.mockResolvedValueOnce(fakeCol as never);
      pMock.board.update.mockResolvedValueOnce({} as never);
      return cb(pMock);
    });

    const colRes = await request(app)
      .post('/api/columns')
      .set('Cookie', 'accessToken=test-access-token')
      .send({ boardId: 'board-1', name: 'Review', wipLimit: 3 });

    expect(colRes.status).toBe(201);
    expect(colRes.body.name).toBe('Review');

    pMock.board.findUnique
      .mockResolvedValueOnce({ projectId: 'proj-1' } as never)
      .mockResolvedValueOnce({
        storyColumnId: 'col-backlog',
        workflowColumnIds: JSON.stringify(['col-doing', 'col-done', 'col-closed']),
        resolvedColumnId: 'col-done',
        closedColumnId: 'col-closed',
      } as never);
    pMock.projectMember.findUnique.mockResolvedValue({
      role: 'PROJECT_ADMIN',
    } as never);
    pMock.column.findUnique.mockResolvedValue({ wipLimit: null } as never);
    pMock.task.create.mockResolvedValue({
      id: 'task-1',
      title: 'Write integration tests',
      type: 'TASK',
      priority: 'HIGH',
      columnId: 'col-doing',
      boardId: 'board-1',
      reporterId: 'user-1',
      assigneeId: null,
    } as never);

    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', 'accessToken=test-access-token')
      .send({
        title: 'Write integration tests',
        type: 'TASK',
        priority: 'HIGH',
        columnId: 'col-doing',
        boardId: 'board-1',
        reporterId: 'user-1',
      });

    expect(taskRes.status).toBe(201);
    expect(taskRes.body.title).toBe('Write integration tests');
  });
});

describe('Integration: Comment flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  it('creates, edits, and deletes a comment through the real app', async () => {
    pMock.task.findUnique.mockResolvedValueOnce({
      board: { projectId: 'proj-1' },
    } as never);
    pMock.projectMember.findUnique.mockResolvedValue({
      role: 'PROJECT_ADMIN',
    } as never);
    pMock.comment.create.mockResolvedValue({
      id: 'comment-1',
      content: 'Initial comment',
      taskId: 'task-1',
      authorId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    pMock.task.findUnique.mockResolvedValueOnce({
      assigneeId: null,
      reporterId: 'user-1',
      title: 'Some Task',
      column: { name: 'Doing' },
      board: { projectId: 'proj-1', name: 'Board', project: { name: 'Project' } },
    } as never);

    const createRes = await request(app)
      .post('/api/comments')
      .set('Cookie', 'accessToken=test-access-token')
      .send({ content: 'Initial comment', taskId: 'task-1' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.content).toBe('Initial comment');

    pMock.comment.findUnique.mockResolvedValueOnce({
      id: 'comment-1',
      content: 'Initial comment',
      taskId: 'task-1',
      authorId: 'user-1',
    } as never);
    pMock.comment.findUnique.mockResolvedValueOnce({
      id: 'comment-1',
      authorId: 'user-1',
    } as never);
    pMock.comment.update.mockResolvedValue({
      id: 'comment-1',
      content: 'Updated comment',
      taskId: 'task-1',
      authorId: 'user-1',
      task: { boardId: 'board-1' },
    } as never);

    const editRes = await request(app)
      .put('/api/comments/comment-1')
      .set('Cookie', 'accessToken=test-access-token')
      .send({ content: 'Updated comment' });

    expect(editRes.status).toBe(200);
    expect(editRes.body.content).toBe('Updated comment');

    pMock.comment.findUnique.mockResolvedValueOnce({
      id: 'comment-1',
      content: 'Updated comment',
      taskId: 'task-1',
      authorId: 'user-1',
    } as never);
    pMock.comment.findUnique.mockResolvedValueOnce({
      id: 'comment-1',
      authorId: 'user-1',
    } as never);
    pMock.comment.findUnique.mockResolvedValueOnce({
      task: { boardId: 'board-1' },
    } as never);
    pMock.comment.delete.mockResolvedValue({} as never);

    const delRes = await request(app)
      .delete('/api/comments/comment-1')
      .set('Cookie', 'accessToken=test-access-token');

    expect(delRes.status).toBe(200);
    expect(delRes.body.message).toBe('Comment deleted successfully');
  });
});

describe('Integration: Notification flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  it('fetches notifications and marks one as read', async () => {
    pMock.notification.findMany.mockResolvedValue([
      { id: 'notif-1', message: 'You were assigned', isRead: false },
    ] as never);

    const listRes = await request(app)
      .get('/api/notifications')
      .set('Cookie', 'accessToken=test-access-token');

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);

    pMock.notification.findUnique.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      isRead: false,
    } as never);
    pMock.notification.update.mockResolvedValue({
      id: 'notif-1',
      isRead: true,
    } as never);

    const readRes = await request(app)
      .patch('/api/notifications/notif-1/read')
      .set('Cookie', 'accessToken=test-access-token');

    expect(readRes.status).toBe(200);
    expect(readRes.body.isRead).toBe(true);
  });
});

describe('Integration: User management flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  it('lists users, updates name, and changes global role', async () => {
    pMock.user.findMany.mockResolvedValue([
      { id: 'user-1', name: 'Admin', email: 'admin@example.com', globalRole: 'GLOBAL_ADMIN', avatarUrl: null },
    ] as never);

    const listRes = await request(app)
      .get('/api/users')
      .set('Cookie', 'accessToken=test-access-token');

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);

    pMock.user.update.mockResolvedValue({
      id: 'user-1',
      name: 'Renamed',
      email: 'admin@example.com',
      avatarUrl: null,
    } as never);

    const nameRes = await request(app)
      .post('/api/users/name')
      .set('Cookie', 'accessToken=test-access-token')
      .send({ name: 'Renamed' });

    expect(nameRes.status).toBe(200);
    expect(nameRes.body.user.name).toBe('Renamed');

    /* ── Change Global Role ───────────────────────────── */
    pMock.user.findUnique.mockResolvedValue({
      id: 'user-2',
      globalRole: 'USER',
    } as never);
    pMock.user.update.mockResolvedValue({
      id: 'user-2',
      name: 'Other',
      email: 'other@example.com',
      avatarUrl: null,
      globalRole: 'GLOBAL_ADMIN',
    } as never);

    const roleRes = await request(app)
      .patch('/api/users/user-2/global-role')
      .set('Cookie', 'accessToken=test-access-token')
      .send({ globalRole: 'GLOBAL_ADMIN' });

    expect(roleRes.status).toBe(200);
    expect(roleRes.body.message).toMatch(/success/i);
  });
});

describe('Integration: Project member flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  it('adds a member, updates role, and removes member', async () => {
    pMock.projectMember.findUnique.mockResolvedValueOnce({
      role: 'PROJECT_ADMIN',
    } as never);
    pMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-2',
    } as never);
    pMock.projectMember.findUnique.mockResolvedValueOnce(null);
    pMock.projectMember.create.mockResolvedValue({
      userId: 'user-2',
      projectId: 'proj-1',
      role: 'PROJECT_MEMBER',
    } as never);

    const addRes = await request(app)
      .post('/api/projects/proj-1/members')
      .set('Cookie', 'accessToken=test-access-token')
      .send({ email: 'user2@example.com', role: 'PROJECT_MEMBER' });

    expect(addRes.status).toBe(201);

    pMock.projectMember.findUnique.mockResolvedValueOnce({
      role: 'PROJECT_ADMIN',
    } as never);
    pMock.projectMember.update.mockResolvedValue({
      userId: 'user-2',
      projectId: 'proj-1',
      role: 'PROJECT_ADMIN',
    } as never);

    const updateRes = await request(app)
      .put('/api/projects/proj-1/members/user-2')
      .set('Cookie', 'accessToken=test-access-token')
      .send({ role: 'PROJECT_ADMIN' });

    expect(updateRes.status).toBe(200);

    pMock.projectMember.findUnique.mockResolvedValueOnce({
      role: 'PROJECT_ADMIN',
    } as never);
    pMock.board.findMany.mockResolvedValue([
      { id: 'board-1' },
    ] as never);
    pMock.task.updateMany.mockResolvedValue({ count: 0 } as never);
    pMock.projectMember.delete.mockResolvedValue({} as never);

    const removeRes = await request(app)
      .delete('/api/projects/proj-1/members/user-2')
      .set('Cookie', 'accessToken=test-access-token');

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.message).toBe('Member removed successfully');
  });
});
