import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import {
  makeTask,
  moveTask,
  removeTask,
  closeTask,
  updateTask,
  getData,
} from '../../src/services/task.service';

vi.mock('../../src/utils/prisma', () => ({
  default: pMock,
}));



describe('Task Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  const mockPermissions = (): void => {
    pMock.board.findUnique.mockResolvedValue({ projectId: 'p1' } as never);
    pMock.projectMember.findUnique.mockResolvedValue({ role: 'PROJECT_ADMIN' } as never);
  };

  describe('makeTask', () => {
    it('creates a task successfully', async () => {
      mockPermissions();
      pMock.column.findUnique.mockResolvedValue({ wipLimit: null, name: 'To Do' } as never);
      pMock.task.create.mockResolvedValue({ id: 't1', title: 'Task 1' } as never);

      const res = await makeTask(
        { title: 'Task 1', type: 'TASK', priority: 'LOW', columnId: 'c1', boardId: 'b1', reporterId: 'u1' },
        'u1'
      );

      expect(res.title).toBe('Task 1');
    });

    it('checks WIP limits', async () => {
      mockPermissions();
      pMock.column.findUnique.mockResolvedValue({ wipLimit: 1, name: 'In Progress' } as never);
      pMock.task.count.mockResolvedValue(2); // Over limit

      await expect(makeTask(
        { title: 'Task 1', type: 'TASK', priority: 'LOW', columnId: 'c1', boardId: 'b1', reporterId: 'u1' },
        'u1'
      )).rejects.toThrow(/WIP limit/i);
    });

    it('checks assignee membership', async () => {
      mockPermissions();
      pMock.projectMember.findFirst.mockResolvedValue(null); // Not a member
      
      await expect(makeTask(
        { title: 'Task 1', type: 'TASK', priority: 'LOW', columnId: 'c1', boardId: 'b1', reporterId: 'u1', assigneeId: 'u2' },
        'u1'
      )).rejects.toThrow(/Assignee must be a member/i);
    });
  });

  describe('moveTask', () => {
    it('moves task to new column', async () => {
      pMock.task.findUnique.mockResolvedValue({ id: 't1', boardId: 'b1', type: 'TASK', column: { order: 1 } } as never);
      mockPermissions();
      pMock.column.findUnique.mockResolvedValue({ id: 'c2', order: 2, name: 'In Progress', wipLimit: null } as never);
      pMock.task.update.mockResolvedValue({ id: 't1', columnId: 'c2' } as never);

      const res = await moveTask('t1', 'c2', 'u1');
      expect(res.columnId).toBe('c2');
    });

    it('throws if jumping columns for non-STORY', async () => {
      pMock.task.findUnique.mockResolvedValue({ id: 't1', boardId: 'b1', type: 'TASK', column: { order: 1 } } as never);
      mockPermissions();
      pMock.column.findUnique.mockResolvedValue({ id: 'c3', order: 3, name: 'Done', wipLimit: null } as never);

      await expect(moveTask('t1', 'c3', 'u1')).rejects.toThrow(/adjacent columns/i);
    });
  });

  describe('removeTask', () => {
    it('removes task and children', async () => {
      pMock.task.findUnique.mockResolvedValue({ boardId: 'b1', closedAt: null } as never);
      mockPermissions();
      pMock.task.count.mockResolvedValue(0);
      pMock.task.delete.mockResolvedValue({ id: 't1' } as never);

      await removeTask('t1', 'u1');
      expect(pMock.task.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    });

    it('throws if closed task is deleted', async () => {
       pMock.task.findUnique.mockResolvedValue({ boardId: 'b1', closedAt: new Date() } as never);
       await expect(removeTask('t1', 'u1')).rejects.toThrow(/closed and locked/i);
    });
  });

  describe('closeTask', () => {
    it('closes task successfully', async () => {
      pMock.task.findUnique.mockResolvedValue({ id: 't1', boardId: 'b1' } as never);
      mockPermissions();
      pMock.task.update.mockResolvedValue({ id: 't1', closedAt: new Date() } as never);

      await closeTask('t1', 'u1');
      expect(pMock.task.update).toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('updates task details', async () => {
      pMock.task.findUnique.mockResolvedValue({ id: 't1', boardId: 'b1', assigneeId: 'u1' } as never);
      mockPermissions();
      pMock.task.update.mockResolvedValue({ id: 't1', title: 'New' } as never);

      const res = await updateTask('t1', { title: 'New' }, 'u1');
      expect(res.title).toBe('New');
    });
  });

  describe('getData', () => {
    it('fetches task with relationships', async () => {
      pMock.task.findUnique.mockResolvedValue({ id: 't1' } as never);
      const res = await getData('t1');
      expect(res.id).toBe('t1');
    });
  });
});
