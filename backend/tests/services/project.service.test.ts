import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import {
  getUserProjects,
  createProject,
  archiveProject,
  deleteProject,
} from '../../src/services/project.service';

vi.mock('../../src/utils/prisma', () => ({
  default: pMock,
}));

describe('Project Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  describe('getUserProjects', () => {
    it('returns projects formatted correctly', async () => {
      pMock.project.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'P1',
          description: 'desc',
          isArchived: false,
          members: [
            { userId: 'u1', role: 'PROJECT_ADMIN', user: { id: 'u1', name: 'User 1', email: 'u@example.com', avatarUrl: null } },
          ],
          boards: [{ id: 'b1', name: 'Board 1' }],
        },
      ] as never);

      const res = await getUserProjects('u1', 'USER');

      expect(res).toHaveLength(1);
      expect(res[0].name).toBe('P1');
      expect(res[0].userRole).toBe('PROJECT_ADMIN');
      expect(res[0].members[0].name).toBe('User 1');
    });
  });

  describe('createProject', () => {
    it('creates a new project with default board and columns', async () => {
      pMock.project.create.mockResolvedValue({ id: 'p1', name: 'New Proj' } as never);

      const res = await createProject('u1', { name: 'New Proj', description: 'test' });
      expect(res.name).toBe('New Proj');
      expect(pMock.project.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          name: 'New Proj',
          description: 'test',
          members: expect.any(Object),
          boards: expect.any(Object),
        }),
      }));
    });
  });

  describe('archiveProject', () => {
    it('archives project if GLOBAL_ADMIN', async () => {
      pMock.project.update.mockResolvedValue({ id: 'p1', isArchived: true } as never);

      const res = await archiveProject('u1', 'p1', 'GLOBAL_ADMIN', { isArchived: true });

      expect(res.isArchived).toBe(true);
      expect(pMock.projectMember.findUnique).not.toHaveBeenCalled();
    });

    it('archives project if PROJECT_ADMIN', async () => {
      pMock.projectMember.findUnique.mockResolvedValue({ role: 'PROJECT_ADMIN' } as never);
      pMock.project.update.mockResolvedValue({ id: 'p1', name: 'Updated' } as never);

      const res = await archiveProject('u1', 'p1', 'USER', { name: 'Updated ' });

      expect(res.name).toBe('Updated');
    });

    it('throws error if not PROJECT_ADMIN', async () => {
      pMock.projectMember.findUnique.mockResolvedValue({ role: 'PROJECT_VIEWER' } as never);
      await expect(archiveProject('u1', 'p1', 'USER', { isArchived: true })).rejects.toThrow(/Forbidden/i);
    });

    it('throws error if name is empty', async () => {
      pMock.projectMember.findUnique.mockResolvedValue({ role: 'PROJECT_ADMIN' } as never);
      await expect(archiveProject('u1', 'p1', 'USER', { name: '   ' })).rejects.toThrow(/name is required/i);
    });
  });

  describe('deleteProject', () => {
    it('deletes project if GLOBAL_ADMIN', async () => {
      pMock.project.findUnique.mockResolvedValue({ id: 'p1' } as never);
      await deleteProject('p1', 'GLOBAL_ADMIN');
      expect(pMock.project.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });

    it('throws error if not GLOBAL_ADMIN', async () => {
      await expect(deleteProject('p1', 'USER')).rejects.toThrow(/Forbidden/i);
    });

    it('throws error if project not found', async () => {
      pMock.project.findUnique.mockResolvedValue(null);
      await expect(deleteProject('p1', 'GLOBAL_ADMIN')).rejects.toThrow(/not found/i);
    });
  });
});
