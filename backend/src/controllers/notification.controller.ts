import { Response } from 'express';
import { AuthRequest } from './auth.controller';
import { getNotifications, markNotificationAsRead } from '../services/notification.service';

export const getUserNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const notifications = await getNotifications(userId);
        res.status(200).json(notifications);
    } catch {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

export const readNotification = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const notification = await markNotificationAsRead(id as string, userId);
        res.status(200).json(notification);
    } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to mark notification as read' });
        }
    }
};
