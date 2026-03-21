import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import { addMember, updateMemberRole, removeMember } from '../../src/services/project-member.service';

vi.mock('../../src/utils/prisma', () => ({ default: pMock }));

describe('Project Member Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  const mockAdminCheck = (): void => {
    pMock.projectMember.findUnique.mockResolvedValue({ role: 'PROJECT_ADMIN' } as never);
  };

  describe('addMember', () => {
    it('adds generic member successfully', async () => {
      mockAdminCheck();
      pMock.user.findUnique.mockResolvedValue({ id: 'u2' } as never);
      pMock.projectMember.create.mockResolvedValue({ userId: 'u2', role: 'PROJECT_MEMBER' } as never);

      const res = await addMember('u1', undefined, 'p1', 'em@em.com', 'PROJECT_MEMBER');
      expect(res.userId).toBe('u2');
      expect(pMock.projectMember.create).toHaveBeenCalled();
    });

    it('throws if requester lacks permission', async () => {
      pMock.projectMember.findUnique.mockResolvedValue({ role: 'PROJECT_MEMBER' } as never);
      await expect(addMember('u1', undefined, 'p1', 'em@em.com', 'PROJECT_MEMBER')).rejects.toThrow(/Forbidden/i);
    });
  });

  describe('updateMemberRole', () => {
    it('updates role', async () => {
      mockAdminCheck();
      pMock.projectMember.update.mockResolvedValue({ userId: 'u2', role: 'PROJECT_ADMIN' } as never);
      await updateMemberRole('u1', undefined, 'p1', 'u2', 'PROJECT_ADMIN');
      expect(pMock.projectMember.update).toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('removes member and unassigns tasks', async () => {
      mockAdminCheck();
      pMock.board.findMany.mockResolvedValue([{ id: 'b1' }] as never);
      
      await removeMember('u1', undefined, 'p1', 'u2');
      
      expect(pMock.task.updateMany).toHaveBeenCalledWith({
        where: { boardId: { in: ['b1'] }, assigneeId: 'u2' },
        data: { assigneeId: null }
      });
      expect(pMock.projectMember.delete).toHaveBeenCalled();
    });
  });
});
