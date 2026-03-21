import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import { logAct } from '../../src/services/audit.service';

vi.mock('../../src/utils/prisma', () => ({
  default: pMock,
}));

describe('Audit Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  describe('logAct', () => {
    it('creates an audit log successfully', async () => {
      pMock.auditLog.create.mockResolvedValue({ id: '1' } as never);

      await logAct('task-1', 'user-1', 'UPDATED', 'old', 'new');

      expect(pMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          taskId: 'task-1',
          userId: 'user-1',
          action: 'UPDATED',
          oldValue: 'old',
          newValue: 'new',
        },
      });
    });

    it('catches and logs error instead of throwing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      pMock.auditLog.create.mockRejectedValue(new Error('DB Error'));

      await logAct('task-1', 'user-1', 'UPDATED');

      expect(consoleSpy).toHaveBeenCalledWith('Error logging audit:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});
