import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import * as userService from '../../src/services/user.service';
import {
  listUsers,
  updateUserAvatar,
  changeName,
  changePassword,
} from '../../src/controllers/user.controller';

vi.mock('../../src/utils/prisma', () => ({
  default: pMock,
}));

vi.mock('../../src/services/user.service', () => ({
  updateName: vi.fn(),
  updatePassword: vi.fn(),
}));

const buildApp = (userId?: string): express.Express => {
  const app = express();
  app.use(express.json());

  const mockAuth = (req: Request, _res: Response, next: NextFunction): void => {
    if (userId) {
      (req as Request & { user: { id: string; globalRole: string } }).user = { id: userId, globalRole: 'USER' };
    }
    next();
  };

  app.get('/api/users', mockAuth, listUsers);
  app.patch('/api/users/avatar', mockAuth, updateUserAvatar);
  app.patch('/api/users/name', mockAuth, changeName);
  app.patch('/api/users/password', mockAuth, changePassword);

  return app;
};

describe('User Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  describe('GET /api/users', () => {
    it('returns a list of users', async () => {
      pMock.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'Alice', email: 'alice@example.com', globalRole: 'USER', avatarUrl: null }
      ] as never);

      const res = await request(buildApp('user-1')).get('/api/users');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Alice');
    });

    it('returns 401 if not authenticated', async () => {
      const res = await request(buildApp()).get('/api/users');
      expect(res.status).toBe(401);
    });

    it('returns 500 if DB fails', async () => {
      pMock.user.findMany.mockRejectedValue(new Error('DB error'));
      const res = await request(buildApp('user-1')).get('/api/users');
      expect(res.status).toBe(500);
    });
  });

  describe('PATCH /api/users/avatar', () => {
    it('updates user avatar and returns the new url', async () => {
      pMock.user.update.mockResolvedValue({
        id: 'user-1',
        avatarUrl: 'https://example.com/avatar.png'
      } as never);

      const res = await request(buildApp('user-1'))
        .patch('/api/users/avatar')
        .send({ avatarUrl: 'https://example.com/avatar.png' });

      expect(res.status).toBe(200);
      expect(res.body.avatarUrl).toBe('https://example.com/avatar.png');
      expect(pMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { avatarUrl: 'https://example.com/avatar.png' },
      });
    });

    it('returns 400 when avatarUrl is missing', async () => {
      const res = await request(buildApp('user-1')).patch('/api/users/avatar').send({});
      expect(res.status).toBe(400);
    });

    it('returns 500 on db error', async () => {
      pMock.user.update.mockRejectedValue(new Error('DB erro'));
      const res = await request(buildApp('user-1'))
        .patch('/api/users/avatar')
        .send({ avatarUrl: 'foo' });
      expect(res.status).toBe(500);
    });
  });

  describe('PATCH /api/users/name', () => {
    it('updates name and returns success', async () => {
      vi.mocked(userService.updateName).mockResolvedValue({ id: 'user-1', name: 'Bob' } as never);

      const res = await request(buildApp('user-1'))
        .patch('/api/users/name')
        .send({ name: 'Bob' });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Bob');
      expect(userService.updateName).toHaveBeenCalledWith('user-1', 'Bob');
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(buildApp('user-1')).patch('/api/users/name').send({});
      expect(res.status).toBe(400);
    });

    it('returns 500 when service fails', async () => {
      vi.mocked(userService.updateName).mockRejectedValue(new Error('Service failed'));
      const res = await request(buildApp('user-1')).patch('/api/users/name').send({ name: 'Bob' });
      expect(res.status).toBe(500);
    });
  });

  describe('PATCH /api/users/password', () => {
    it('updates password and returns success message', async () => {
      vi.mocked(userService.updatePassword).mockResolvedValue(undefined as never);

      const res = await request(buildApp('user-1'))
        .patch('/api/users/password')
        .send({ currentPassword: 'old', newPassword: 'new' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/success/i);
    });

    it('returns 400 when missing passwords', async () => {
      const res = await request(buildApp('user-1'))
        .patch('/api/users/password')
        .send({ currentPassword: 'old' }); // newPassword missing

      expect(res.status).toBe(400);
    });

    it('returns 500 on service error', async () => {
      vi.mocked(userService.updatePassword).mockRejectedValue(new Error('Failed'));
      const res = await request(buildApp('user-1'))
        .patch('/api/users/password')
        .send({ currentPassword: 'old', newPassword: 'new' });
      expect(res.status).toBe(500);
    });
  });
});
