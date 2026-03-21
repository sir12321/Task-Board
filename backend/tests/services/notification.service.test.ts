import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import {
  createNotification,
  getNotifications,
  markNotificationAsRead,
} from '../../src/services/notification.service';

vi.mock('../../src/utils/prisma', () => ({
  default: pMock,
}));

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset(pMock);
  });

  describe('createNotification', () => {
    it('creates a notification', async () => {
      pMock.notification.create.mockResolvedValue({
        id: '1',
        userId: 'user-1',
        content: 'hello',
      } as never);

      const res = await createNotification('user-1', 'hello');

      expect(res.content).toBe('hello');
      expect(pMock.notification.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', content: 'hello' }
      });
    });
  });

  describe('getNotifications', () => {
    it('returns notifications for user ordered by descending date', async () => {
      pMock.notification.findMany.mockResolvedValue([
        { id: '1', userId: 'user-1', content: 'hello' }
      ] as never);

      const res = await getNotifications('user-1');

      expect(res).toHaveLength(1);
      expect(pMock.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('markNotificationAsRead', () => {
    it('marks a valid notification as read', async () => {
      pMock.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        isRead: false,
      } as never);

      pMock.notification.update.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        isRead: true,
      } as never);

      const res = await markNotificationAsRead('notif-1', 'user-1');

      expect(res.isRead).toBe(true);
      expect(pMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true }
      });
    });

    it('throws error if notification is not found', async () => {
      pMock.notification.findUnique.mockResolvedValue(null);

      await expect(markNotificationAsRead('notif-1', 'user-1')).rejects.toThrow('Notification not found or unauthorized');
    });

    it('throws error if user is unauthorized', async () => {
      pMock.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'other-user',
        isRead: false,
      } as never);

      await expect(markNotificationAsRead('notif-1', 'user-1')).rejects.toThrow('Notification not found or unauthorized');
    });
  });
});
