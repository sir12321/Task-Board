import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as notificationService from '../../src/services/notification.service';
import {
  getUserNotifications,
  readNotification,
} from '../../src/controllers/notification.controller';

vi.mock('../../src/services/notification.service', () => ({
  getNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
}));

const buildApp = (userId?: string): express.Express => {
  const app = express();
  app.use(express.json());

  const mockAuth = (req: Request, _res: Response, next: NextFunction): void => {
    if (userId) {
      (req as Request & { user: { id: string; globalRole: string } }).user = { id: userId, globalRole: 'USER' };
    }
    next();
  };

  app.get('/api/notifications', mockAuth, getUserNotifications);
  app.patch('/api/notifications/:id/read', mockAuth, readNotification);

  return app;
};

const sampleNotification = {
  id: 'notif-1',
  userId: 'user-1',
  message: 'Hello World',
  isRead: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Notification Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/notifications', () => {
    it('returns notifications for the authenticated user', async () => {
      vi.mocked(notificationService.getNotifications).mockResolvedValue([sampleNotification] as never);

      const res = await request(buildApp('user-1')).get('/api/notifications');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].message).toBe('Hello World');
      expect(notificationService.getNotifications).toHaveBeenCalledWith('user-1');
    });

    it('returns 401 if user is not authenticated', async () => {
      const res = await request(buildApp()).get('/api/notifications');
      expect(res.status).toBe(401);
    });

    it('returns 500 if service throws an error', async () => {
      vi.mocked(notificationService.getNotifications).mockRejectedValue(new Error('DB Error'));

      const res = await request(buildApp('user-1')).get('/api/notifications');
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Failed to fetch/i);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('marks a notification as read and returns it', async () => {
      const readNotif = { ...sampleNotification, isRead: true };
      vi.mocked(notificationService.markNotificationAsRead).mockResolvedValue(readNotif as never);

      const res = await request(buildApp('user-1')).patch('/api/notifications/notif-1/read');

      expect(res.status).toBe(200);
      expect(res.body.isRead).toBe(true);
      expect(notificationService.markNotificationAsRead).toHaveBeenCalledWith('notif-1', 'user-1');
    });

    it('returns 401 if user is not authenticated', async () => {
      const res = await request(buildApp()).patch('/api/notifications/notif-1/read');
      expect(res.status).toBe(401);
    });

    it('returns 404 if notification is not found', async () => {
      vi.mocked(notificationService.markNotificationAsRead).mockRejectedValue(new Error('Notification not found'));

      const res = await request(buildApp('user-1')).patch('/api/notifications/notif-99/read');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Notification not found');
    });

    it('returns 500 on unexpected errors', async () => {
      vi.mocked(notificationService.markNotificationAsRead).mockRejectedValue(new Error('DB Error'));

      const res = await request(buildApp('user-1')).patch('/api/notifications/notif-1/read');
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Failed to mark/i);
    });
  });
});
