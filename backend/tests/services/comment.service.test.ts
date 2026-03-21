import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import * as notificationService from '../../src/services/notification.service';
import * as richTextUtil from '../../src/utils/richText.util';
import * as mentionUtil from '../../src/utils/mention.util';
import { makeComment, deleteComment, editComment } from '../../src/services/comment.service';

vi.mock('../../src/utils/prisma', () => ({ default: pMock }));
vi.mock('../../src/services/notification.service', () => ({ createNotification: vi.fn() }));
vi.mock('../../src/utils/richText.util', () => ({
  getRichTextNotificationSnippet: vi.fn(),
  getRichTextPlainText: vi.fn(),
  correctRichTextComment: vi.fn(),
}));
vi.mock('../../src/utils/mention.util', () => ({ resolveMentionedUserIds: vi.fn() }));

describe('Comment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  describe('makeComment', () => {
    it('creates comment and sends notifications', async () => {
      vi.mocked(richTextUtil.correctRichTextComment).mockReturnValue('<p>hello @user2</p>');
      vi.mocked(richTextUtil.getRichTextPlainText).mockReturnValue('hello @user2');
      vi.mocked(richTextUtil.getRichTextNotificationSnippet).mockReturnValue('hello');
      
      pMock.comment.create.mockResolvedValue({ id: 'c1', content: '<p>hello @user2</p>', authorId: 'u1', taskId: 't1' } as never);
      pMock.task.findUnique.mockResolvedValue({
        assigneeId: 'a1', reporterId: 'u1', title: 'Task 1',
        column: { name: 'To Do' },
        board: { projectId: 'p1', name: 'Board 1', project: { name: 'Proj 1' } }
      } as never);

      vi.mocked(mentionUtil.resolveMentionedUserIds).mockResolvedValue(['user2']);
      vi.mocked(notificationService.createNotification).mockResolvedValue({} as never);

      const res = await makeComment({ content: 'hello @user2', authorId: 'u1', taskId: 't1' });
      
      expect(res.id).toBe('c1');
      expect(notificationService.createNotification).toHaveBeenCalled();
    });

    it('throws error if empty comment', async () => {
      vi.mocked(richTextUtil.correctRichTextComment).mockReturnValue('');
      vi.mocked(richTextUtil.getRichTextPlainText).mockReturnValue('');
      await expect(makeComment({ content: '', authorId: 'u1', taskId: 't1' })).rejects.toThrow(/cannot be empty/i);
    });
  });

  describe('deleteComment', () => {
    it('deletes successfully if author', async () => {
      pMock.comment.findUnique.mockResolvedValue({ authorId: 'u1' } as never);
      await deleteComment('c1', 'u1');
      expect(pMock.comment.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });

    it('deletes successfully if global admin', async () => {
      pMock.comment.findUnique.mockResolvedValue({ authorId: 'u2' } as never);
      await deleteComment('c1', 'u1', 'GLOBAL_ADMIN');
      expect(pMock.comment.delete).toHaveBeenCalled();
    });

    it('throws error if not author', async () => {
      pMock.comment.findUnique.mockResolvedValue({ authorId: 'u2' } as never);
      await expect(deleteComment('c1', 'u1')).rejects.toThrow(/Unauthorized/i);
    });
  });

  describe('editComment', () => {
    it('edits successfully if author', async () => {
      vi.mocked(richTextUtil.correctRichTextComment).mockReturnValue('<p>new</p>');
      vi.mocked(richTextUtil.getRichTextPlainText).mockReturnValue('new');
      pMock.comment.findUnique.mockResolvedValue({ authorId: 'u1' } as never);
      pMock.comment.update.mockResolvedValue({ id: 'c1', content: '<p>new</p>' } as never);

      const res = await editComment('c1', 'u1', 'new');
      expect(res.content).toBe('<p>new</p>');
    });
  });
});
