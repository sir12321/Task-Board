import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import * as hashUtil from '../../src/utils/hash.util';
import * as jwtUtil from '../../src/utils/jwt.util';
import {
  registerUser,
  loginUser,
  getAuthUserById,
  refreshSession,
  logoutUser,
} from '../../src/services/auth.service';

vi.mock('../../src/utils/prisma', () => ({ default: pMock }));

vi.mock('../../src/utils/hash.util', () => ({
  hashPassword: vi.fn(),
  comparePasswords: vi.fn(),
}));

vi.mock('../../src/utils/jwt.util', () => ({
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  describe('registerUser', () => {
    it('registers user if email is new', async () => {
      pMock.user.findUnique.mockResolvedValue(null);
      pMock.user.count.mockResolvedValue(0);
      vi.mocked(hashUtil.hashPassword).mockResolvedValue('hashed-pw');
      pMock.user.create.mockResolvedValue({
        id: 'u1',
        email: 'test@admin.com',
        name: 'Admin',
        globalRole: 'GLOBAL_ADMIN',
      } as never);

      const res = await registerUser({
        email: 'test@admin.com',
        password: 'pw',
        name: 'Admin',
      });

      expect(res.globalRole).toBe('GLOBAL_ADMIN');
      expect(pMock.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@admin.com',
          password: 'hashed-pw',
          name: 'Admin',
          globalRole: 'GLOBAL_ADMIN',
        },
      });
    });

    it('registers user as normal user if not first', async () => {
      pMock.user.findUnique.mockResolvedValue(null);
      pMock.user.count.mockResolvedValue(1); // not first
      vi.mocked(hashUtil.hashPassword).mockResolvedValue('hashed-pw');
      pMock.user.create.mockResolvedValue({
        id: 'u1',
        email: 'test@u.com',
        name: 'User',
        globalRole: 'USER',
      } as never);

      const res = await registerUser({
        email: 'test@u.com',
        password: 'pw',
        name: 'User',
      });

      expect(res.globalRole).toBe('USER');
    });

    it('throws error if email exists', async () => {
      pMock.user.findUnique.mockResolvedValue({ id: 'u1' } as never);
      await expect(
        registerUser({ email: 'a@a.com', password: 'pw', name: 'N' }),
      ).rejects.toThrow(/already exists/i);
    });
  });

  describe('loginUser', () => {
    it('returns tokens on valid credentials', async () => {
      pMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@a.com',
        password: 'hashed-pw',
        globalRole: 'USER',
      } as never);
      vi.mocked(hashUtil.comparePasswords).mockResolvedValue(true);
      vi.mocked(jwtUtil.generateAccessToken).mockReturnValue('acc-token');
      vi.mocked(jwtUtil.generateRefreshToken).mockReturnValue('ref-token');

      const res = await loginUser({ email: 'a@a.com', password: 'pw' });

      expect(res.accessToken).toBe('acc-token');
      expect(res.refreshToken).toBe('ref-token');
      expect(res.user.id).toBe('u1');
      expect(pMock.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { refreshToken: 'ref-token' },
      });
    });

    it('throws error on invalid credentials (wrong password)', async () => {
      pMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        password: 'hashed-pw',
      } as never);
      vi.mocked(hashUtil.comparePasswords).mockResolvedValue(false);
      await expect(
        loginUser({ email: 'a@a.com', password: 'wrong' }),
      ).rejects.toThrow(/Invalid email or password/i);
    });

    it('throws error on user not found', async () => {
      pMock.user.findUnique.mockResolvedValue(null);
      await expect(
        loginUser({ email: 'a@a.com', password: 'pw' }),
      ).rejects.toThrow(/Invalid email or password/i);
    });
  });

  describe('getAuthUserById', () => {
    it('returns auth payload for user', async () => {
      pMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Test',
      } as never);
      const res = await getAuthUserById('u1');
      expect(res?.name).toBe('Test');
    });
  });

  describe('refreshSession', () => {
    it('returns new access token for valid refresh token', async () => {
      vi.mocked(jwtUtil.verifyRefreshToken).mockReturnValue({
        userId: 'u1',
      } as never);
      const mockDbUser = {
        id: 'u1',
        globalRole: 'USER',
        refreshToken: 'ref-token',
      };

      pMock.user.findUnique.mockResolvedValue(mockDbUser as never);

      vi.mocked(jwtUtil.generateAccessToken).mockReturnValue('new-acc-token');

      const res = await refreshSession('ref-token');
      expect(res.accessToken).toBe('new-acc-token');
      expect(res.user.id).toBe('u1');
    });

    it('throws error if refresh token mismatch', async () => {
      vi.mocked(jwtUtil.verifyRefreshToken).mockReturnValue({
        userId: 'u1',
      } as never);
      pMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        refreshToken: 'other-token',
      } as never);
      await expect(refreshSession('ref-token')).rejects.toThrow(
        /Invalid refresh token/i,
      );
    });

    it('throws error if user not found on refresh', async () => {
      vi.mocked(jwtUtil.verifyRefreshToken).mockReturnValue({
        userId: 'u1',
      } as never);
      pMock.user.findUnique.mockResolvedValue(null);
      await expect(refreshSession('ref-token')).rejects.toThrow(
        /Invalid refresh token/i,
      );
    });
  });

  describe('logoutUser', () => {
    it('clears refresh token', async () => {
      await logoutUser('u1');
      expect(pMock.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { refreshToken: null },
      });
    });
  });
});
