import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import * as hashUtil from '../../src/utils/hash.util';
import { updateName, updatePassword } from '../../src/services/user.service';

vi.mock('../../src/utils/prisma', () => ({
  default: pMock,
}));

vi.mock('../../src/utils/hash.util', () => ({
  hashPassword: vi.fn(),
  comparePasswords: vi.fn(),
}));

describe('User Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  describe('updateName', () => {
    it('updates user name successfully', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'New Name',
        email: 'test@example.com',
        avatarUrl: null,
      };
      pMock.user.update.mockResolvedValue(mockUser as never);

      const result = await updateName('user-1', 'New Name');

      expect(result).toEqual(mockUser);
      expect(pMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'New Name' },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      });
    });
  });

  describe('updatePassword', () => {
    it('updates password successfully if current password is valid', async () => {
      pMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        password: 'hashed-old-password',
      } as never);

      vi.mocked(hashUtil.comparePasswords).mockResolvedValue(true);
      vi.mocked(hashUtil.hashPassword).mockResolvedValue('hashed-new-password');

      await updatePassword('user-1', 'old-password', 'new-password');

      expect(hashUtil.comparePasswords).toHaveBeenCalledWith('old-password', 'hashed-old-password');
      expect(hashUtil.hashPassword).toHaveBeenCalledWith('new-password');
      expect(pMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'hashed-new-password' },
      });
    });

    it('throws error if user is not found', async () => {
      pMock.user.findUnique.mockResolvedValue(null);

      await expect(updatePassword('non-existent', 'old', 'new')).rejects.toThrow('User not found');
    });

    it('throws error if current password is incorrect', async () => {
      pMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        password: 'hashed-old-password',
      } as never);

      vi.mocked(hashUtil.comparePasswords).mockResolvedValue(false);

      await expect(updatePassword('user-1', 'wrong-old', 'new')).rejects.toThrow('Current password is incorrect');
    });
  });
});
