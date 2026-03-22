import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import {
  getBoards,
  createBoard,
  verifyCreationPermission,
  updateBoardWorkflow,
} from '../../src/services/board.service';

vi.mock('../../src/utils/prisma', () => ({
  default: pMock,
}));

describe('Board Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  describe('createBoard', () => {
    it('creates a board with default columns', async () => {
      pMock.board.create.mockResolvedValue({
        id: 'b1',
        name: 'B',
        projectId: 'p1',
      } as never);
      pMock.$transaction.mockImplementation(async (callback) =>
        callback({
          board: pMock.board,
          column: pMock.column,
        } as never),
      );

      const res = await createBoard('p1', 'B');

      expect(res.name).toBe('B');
      expect(pMock.board.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'B',
          projectId: 'p1',
          storyColumnId: expect.any(String),
          workflowColumnIds: expect.any(String),
          resolvedColumnId: expect.any(String),
          closedColumnId: expect.any(String),
        }),
      });
      expect(pMock.column.create).toHaveBeenCalledTimes(5);
    });
  });

  describe('verifyCreationPermission', () => {
    it('allows global admin without checking project membership', async () => {
      await verifyCreationPermission('u1', 'p1', 'GLOBAL_ADMIN');
      expect(pMock.projectMember.findUnique).not.toHaveBeenCalled();
    });

    it('throws error if user is not a member of project', async () => {
      pMock.projectMember.findUnique.mockResolvedValue(null);
      await expect(verifyCreationPermission('u1', 'p1')).rejects.toThrow(
        /not a member/i,
      );
    });

    it('throws error if user is a member but not admin', async () => {
      pMock.projectMember.findUnique.mockResolvedValue({
        role: 'PROJECT_MEMBER',
      } as never);
      await expect(verifyCreationPermission('u1', 'p1')).rejects.toThrow(
        /Only project admins/i,
      );
    });

    it('allows project admin', async () => {
      pMock.projectMember.findUnique.mockResolvedValue({
        role: 'PROJECT_ADMIN',
      } as never);
      await expect(verifyCreationPermission('u1', 'p1')).resolves.not.toThrow();
    });
  });

  describe('getBoards', () => {
    it('returns null if board not found', async () => {
      pMock.board.findUnique.mockResolvedValue(null);
      const res = await getBoards('b1');
      expect(res).toBeNull();
    });

    it('returns formatted board data', async () => {
      pMock.board.findUnique.mockResolvedValue({
        id: 'b1',
        name: 'B1',
        storyColumnId: 'story-col',
        workflowColumnIds: JSON.stringify([
          'todo-col',
          'doing-col',
          'done-col',
        ]),
        resolvedColumnId: 'doing-col',
        closedColumnId: 'done-col',
        columns: [{ id: 'col1', name: 'colname', order: 0 }],
        tasks: [
          {
            id: 't1',
            type: 'TASK',
            columnId: 'todo-col',
            column: { name: 'colname', order: 0 },
            assignee: { name: 'Assig', avatarUrl: null },
            reporter: null,
            parent: null,
            comments: [],
          },
        ],
      } as never);

      const res = await getBoards('b1');
      expect(res?.id).toBe('b1');
      expect(res?.tasks[0]).toMatchObject({
        columnName: 'colname',
        assigneeName: 'Assig',
        reporterName: 'Unknown',
      });
    });
  });

  describe('updateBoardWorkflow', () => {
    it('updates workflow for a project admin', async () => {
      pMock.board.findUnique.mockResolvedValueOnce({
        projectId: 'p1',
      } as never);
      pMock.projectMember.findUnique.mockResolvedValue({
        role: 'PROJECT_ADMIN',
      } as never);
      pMock.column.findMany.mockResolvedValue([
        { id: 'story-col' },
        { id: 'todo-col' },
        { id: 'doing-col' },
        { id: 'done-col' },
      ] as never);
      pMock.board.update.mockResolvedValue({ id: 'b1' } as never);

      const workflow = {
        storyColumnId: 'story-col',
        workflowColumnIds: ['todo-col', 'doing-col', 'done-col'],
        resolvedColumnId: 'doing-col',
        closedColumnId: 'done-col',
      };

      await updateBoardWorkflow('u1', 'b1', workflow);

      expect(pMock.board.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: {
          storyColumnId: 'story-col',
          workflowColumnIds: JSON.stringify([
            'todo-col',
            'doing-col',
            'done-col',
          ]),
          resolvedColumnId: 'doing-col',
          closedColumnId: 'done-col',
        },
      });
    });
  });
});
