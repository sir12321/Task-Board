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
    pMock.projectMember.findUnique.mockResolvedValue({
      role: 'PROJECT_ADMIN',
    } as never);
  };

  const workflowBoard = {
    storyColumnId: 'story-col',
    workflowColumnIds: JSON.stringify(['todo-col', 'doing-col', 'done-col']),
    resolvedColumnId: 'doing-col',
    closedColumnId: 'done-col',
  };

  describe('makeTask', () => {
    it('creates a task successfully', async () => {
      mockPermissions();
      pMock.board.findUnique
        .mockResolvedValueOnce({ projectId: 'p1' } as never)
        .mockResolvedValueOnce(workflowBoard as never);
      pMock.column.findUnique.mockResolvedValue({ wipLimit: null } as never);
      pMock.task.create.mockResolvedValue({
        id: 't1',
        title: 'Task 1',
      } as never);

      const res = await makeTask(
        {
          title: 'Task 1',
          type: 'TASK',
          priority: 'LOW',
          columnId: 'todo-col',
          boardId: 'b1',
          reporterId: 'u1',
        },
        'u1',
      );

      expect(res.title).toBe('Task 1');
    });

    it('checks WIP limits', async () => {
      mockPermissions();
      pMock.board.findUnique.mockResolvedValueOnce({
        projectId: 'p1',
      } as never);
      pMock.column.findUnique.mockResolvedValue({ wipLimit: 1 } as never);
      pMock.task.count.mockResolvedValue(2); // Over limit

      await expect(
        makeTask(
          {
            title: 'Task 1',
            type: 'TASK',
            priority: 'LOW',
            columnId: 'doing-col',
            boardId: 'b1',
            reporterId: 'u1',
          },
          'u1',
        ),
      ).rejects.toThrow(/WIP limit/i);
    });

    it('checks assignee membership', async () => {
      pMock.board.findUnique
        .mockResolvedValueOnce({ projectId: 'p1' } as never)
        .mockResolvedValueOnce({ projectId: 'p1' } as never);
      pMock.projectMember.findUnique
        .mockResolvedValueOnce({ role: 'PROJECT_ADMIN' } as never)
        .mockResolvedValueOnce(null);

      await expect(
        makeTask(
          {
            title: 'Task 1',
            type: 'TASK',
            priority: 'LOW',
            columnId: 'todo-col',
            boardId: 'b1',
            reporterId: 'u1',
            assigneeId: 'u2',
          },
          'u1',
        ),
      ).rejects.toThrow(/Assignee must be a member/i);
    });
  });

  describe('moveTask', () => {
    it('moves task to new column', async () => {
      pMock.task.findUnique.mockResolvedValue({
        id: 't1',
        boardId: 'b1',
        columnId: 'todo-col',
        type: 'TASK',
        resolvedAt: null,
        column: { order: 1 },
        board: workflowBoard,
      } as never);
      pMock.board.findUnique.mockResolvedValue({ projectId: 'p1' } as never);
      mockPermissions();
      pMock.column.findUnique.mockResolvedValue({
        id: 'doing-col',
        order: 2,
        name: 'In Progress',
        wipLimit: null,
      } as never);
      pMock.task.update.mockResolvedValue({
        id: 't1',
        columnId: 'doing-col',
      } as never);

      const res = await moveTask('t1', 'doing-col', 'u1');
      expect(res.columnId).toBe('doing-col');
    });

    it('throws if jumping columns for non-STORY', async () => {
      pMock.task.findUnique.mockResolvedValue({
        id: 't1',
        boardId: 'b1',
        columnId: 'todo-col',
        type: 'TASK',
        column: { order: 1 },
        board: workflowBoard,
      } as never);
      pMock.board.findUnique.mockResolvedValue({ projectId: 'p1' } as never);
      mockPermissions();
      pMock.column.findUnique.mockResolvedValue({
        id: 'done-col',
        order: 3,
        name: 'Done',
        wipLimit: null,
      } as never);

      await expect(moveTask('t1', 'done-col', 'u1')).rejects.toThrow(
        /next workflow stage/i,
      );
    });
  });

  describe('removeTask', () => {
    it('removes task and children', async () => {
      pMock.task.findUnique.mockResolvedValue({
        boardId: 'b1',
        columnId: 'todo-col',
      } as never);
      pMock.board.findUnique
        .mockResolvedValueOnce({ ...workflowBoard } as never)
        .mockResolvedValueOnce({ projectId: 'p1' } as never);
      pMock.projectMember.findUnique.mockResolvedValue({
        role: 'PROJECT_ADMIN',
      } as never);
      pMock.task.count.mockResolvedValue(0);
      pMock.task.delete.mockResolvedValue({ id: 't1' } as never);

      await removeTask('t1', 'u1');
      expect(pMock.task.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    });

    it('throws if closed task is deleted', async () => {
      pMock.task.findUnique.mockResolvedValue({
        boardId: 'b1',
        columnId: 'done-col',
      } as never);
      pMock.board.findUnique.mockResolvedValue({
        closedColumnId: 'done-col',
      } as never);
      await expect(removeTask('t1', 'u1')).rejects.toThrow(
        /closed and locked/i,
      );
    });
  });

  describe('closeTask', () => {
    it('closes task successfully', async () => {
      pMock.task.findUnique.mockResolvedValue({
        id: 't1',
        boardId: 'b1',
      } as never);
      mockPermissions();
      pMock.task.update.mockResolvedValue({
        id: 't1',
        closedAt: new Date(),
      } as never);

      await closeTask('t1', 'u1');
      expect(pMock.task.update).toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('updates task details', async () => {
      pMock.task.findUnique.mockResolvedValue({
        id: 't1',
        boardId: 'b1',
        columnId: 'todo-col',
        assigneeId: 'u1',
        reporterId: 'u2',
        type: 'TASK',
      } as never);
      pMock.board.findUnique
        .mockResolvedValueOnce({ closedColumnId: 'done-col' } as never)
        .mockResolvedValueOnce({ projectId: 'p1' } as never);
      pMock.projectMember.findUnique.mockResolvedValue({
        role: 'PROJECT_ADMIN',
      } as never);
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
