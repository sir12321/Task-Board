import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import { createColumn, updateColumn, deleteColumn, reorderColumn } from '../../src/services/column.service';

vi.mock('../../src/utils/prisma', () => ({ default: pMock }));

describe('Column Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  const mockAdminCheck = (): void => {
    pMock.board.findUnique.mockResolvedValue({ projectId: 'p1' } as never);
    pMock.projectMember.findUnique.mockResolvedValue({ role: 'PROJECT_ADMIN' } as never);
  };

  describe('createColumn', () => {
    it('creates column correctly', async () => {
      pMock.projectMember.findUnique.mockResolvedValue({ role: 'PROJECT_ADMIN' } as never);
      pMock.board.findUnique
        .mockResolvedValueOnce({ projectId: 'p1' } as never)
        .mockResolvedValueOnce({
          workflowColumnIds: JSON.stringify(['todo-col', 'done-col']),
          closedColumnId: 'done-col',
        } as never);
      pMock.column.findFirst.mockResolvedValue({ order: 1 } as never);
      pMock.column.create.mockResolvedValue({ id: 'c1', name: 'New Col', order: 2 } as never);
      pMock.$transaction.mockImplementation(async (callback) =>
        callback({
          column: pMock.column,
          board: pMock.board,
        } as never),
      );

      const res = await createColumn('u1', 'b1', 'New Col', null);
      expect(res.name).toBe('New Col');
      expect(res.order).toBe(2);
      expect(pMock.column.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'New Col', order: 2, boardId: 'b1' }),
      });
      expect(pMock.board.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: {
          workflowColumnIds: JSON.stringify(['todo-col', 'c1', 'done-col']),
        },
      });
    });

    it('throws error if user not admin', async () => {
      pMock.board.findUnique.mockResolvedValue({ projectId: 'p1' } as never);
      pMock.projectMember.findUnique.mockResolvedValue({ role: 'PROJECT_MEMBER' } as never);
      await expect(createColumn('u1', 'b1', 'New', 1)).rejects.toThrow(/Forbidden/i);
    });
  });

  describe('updateColumn', () => {
    it('updates column correctly', async () => {
      pMock.column.findUnique.mockResolvedValue({ boardId: 'b1' } as never);
      mockAdminCheck();
      pMock.column.update.mockResolvedValue({ id: 'c1', name: 'Updated' } as never);

      const res = await updateColumn('u1', 'c1', { name: 'Updated' });
      expect(res.name).toBe('Updated');
    });
    it('throws if column not found', async () => {
      pMock.column.findUnique.mockResolvedValue(null);
      await expect(updateColumn('u1', '99', {})).rejects.toThrow(/Column not found/i);
    });
  });

  describe('deleteColumn', () => {
    it('deletes column and decrements order of subsequent columns', async () => {
      pMock.column.findUnique.mockResolvedValue({ boardId: 'b1', order: 1 } as never);
      pMock.projectMember.findUnique.mockResolvedValue({ role: 'PROJECT_ADMIN' } as never);
      pMock.board.findUnique
        .mockResolvedValueOnce({ storyColumnId: 'story-col' } as never)
        .mockResolvedValueOnce({ projectId: 'p1' } as never)
        .mockResolvedValueOnce({
          storyColumnId: 'story-col',
          workflowColumnIds: JSON.stringify(['todo-col', 'c1', 'done-col']),
          resolvedColumnId: 'c1',
          closedColumnId: 'done-col',
        } as never);
      pMock.$transaction.mockResolvedValue([] as never);

      await deleteColumn('u1', 'c1');
      expect(pMock.$transaction).toHaveBeenCalledTimes(1);
      expect(pMock.board.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: {
          workflowColumnIds: JSON.stringify(['todo-col', 'done-col']),
          resolvedColumnId: null,
          closedColumnId: undefined,
        },
      });
      expect(pMock.column.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(pMock.column.updateMany).toHaveBeenCalledWith({
        where: { boardId: 'b1', order: { gt: 1 } },
        data: { order: { decrement: 1 } },
      });
    });
  });

  describe('reorderColumn', () => {
    it('swaps columns to left correctly', async () => {
      pMock.column.findUnique.mockResolvedValue({ boardId: 'b1', order: 2 } as never);
      pMock.board.findUnique
        .mockResolvedValueOnce({ projectId: 'p1' } as never)
        .mockResolvedValueOnce({ storyColumnId: 'story-col' } as never);
      pMock.projectMember.findUnique.mockResolvedValue({ role: 'PROJECT_ADMIN' } as never);
      pMock.column.findFirst.mockResolvedValue({ id: 'c0', order: 1 } as never);
      pMock.$transaction.mockResolvedValue([] as never);

      await reorderColumn('u1', 'c1', 'left');
      expect(pMock.$transaction).toHaveBeenCalled();
    });
    it('throws if no adjacent column', async () => {
      pMock.column.findUnique.mockResolvedValue({ boardId: 'b1', order: 0 } as never);
      mockAdminCheck();
      pMock.column.findFirst.mockResolvedValue(null);
      await expect(reorderColumn('u1', 'c0', 'left')).rejects.toThrow(/No adjacent column/i);
    });
  });
});
