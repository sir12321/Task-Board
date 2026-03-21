import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import * as authService from '../../src/services/auth.service';
import {
  register,
  login,
  refresh,
  logout,
} from '../../src/controllers/auth.controller';

vi.mock('../../src/utils/prisma', () => ({
  default: pMock,
}));

vi.mock('../../src/services/auth.service', () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  getAuthUserById: vi.fn(),
  refreshSession: vi.fn(),
  logoutUser: vi.fn(),
}));

type GlobalRole = 'USER' | 'GLOBAL_ADMIN';

const buildApp = (userId?: string, globalRole: GlobalRole = 'USER'): express.Express => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const mockAuth = (req: Request, _res: Response, next: NextFunction): void => {
    if (userId) {
      (req as Request & { user: { id: string; globalRole: string } }).user = {
        id: userId,
        globalRole,
      };
    }
    next();
  };

  app.post('/api/auth/register', register);
  app.post('/api/auth/login', login);
  app.post('/api/auth/refresh', refresh);
  app.post('/api/auth/logout', mockAuth, logout);

  return app;
};

const fakeUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashed',
  avatarUrl: null,
  globalRole: 'USER' as const,
  refreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const safeUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
  globalRole: 'USER',
  notifications: [],
};

describe('Auth Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  describe('POST /api/auth/register', () => {
    it('creates a new user and returns 201', async () => {
      vi.mocked(authService.registerUser).mockResolvedValue(fakeUser);

      const app = buildApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'pass123', name: 'Test User' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('returns 409 when the email is already taken', async () => {
      vi.mocked(authService.registerUser).mockRejectedValue(
        new Error('This email address already exists.'),
      );

      const app = buildApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'taken@example.com', password: 'pass123', name: 'Dup' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in successfully and sets cookies', async () => {
      vi.mocked(authService.loginUser).mockResolvedValue({
        user: fakeUser,
        accessToken: 'acc-tok',
        refreshToken: 'ref-tok',
      });
      vi.mocked(authService.getAuthUserById).mockResolvedValue(safeUser as never);

      const app = buildApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'pass123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.user.id).toBe('user-1');

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((c: string) => c.startsWith('accessToken'))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith('refreshToken'))).toBe(true);
    });

    it('returns 401 for wrong credentials', async () => {
      vi.mocked(authService.loginUser).mockRejectedValue(
        new Error('Invalid email or password'),
      );

      const app = buildApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('returns 401 when the user record cannot be found after token creation', async () => {
      vi.mocked(authService.loginUser).mockResolvedValue({
        user: fakeUser,
        accessToken: 'acc-tok',
        refreshToken: 'ref-tok',
      });
      vi.mocked(authService.getAuthUserById).mockResolvedValue(null);

      const app = buildApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'pass123' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('returns 401 when no refresh token cookie is present', async () => {
      const app = buildApp();
      const res = await request(app).post('/api/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Refresh token missing');
    });

    it('refreshes the session and returns a new access token', async () => {
      vi.mocked(authService.refreshSession).mockResolvedValue({
        accessToken: 'new-acc-tok',
        user: safeUser as never,
      });

      const app = buildApp();
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Session refreshed successfully');
    });

    it('returns 403 for an invalid refresh token', async () => {
      vi.mocked(authService.refreshSession).mockRejectedValue(
        new Error('Invalid refresh token'),
      );

      const app = buildApp();
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=bad-token');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Invalid refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('logs out the current user and clears cookies', async () => {
      vi.mocked(authService.logoutUser).mockResolvedValue(undefined);

      const app = buildApp('user-1');
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logout successful');
      expect(authService.logoutUser).toHaveBeenCalledWith('user-1');
    });

    it('returns 401 when the request has no user identity', async () => {
      const app = buildApp();
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(401);
    });
  });
});
