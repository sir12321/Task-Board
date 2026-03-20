import prisma from '../utils/prisma';
import { Notification } from '@prisma/client';

export const createNotification = async (
  userId: string,
  content: string,
): Promise<Notification> => {
  return prisma.notification.create({
    data: {
      userId,
      content,
    },
  });
};

export const getNotifications = async (
  userId: string,
): Promise<Notification[]> => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

export const markNotificationAsRead = async (
  notificationId: string,
  userId: string,
): Promise<Notification> => {
  // Verify ownership
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    throw new Error('Notification not found or unauthorized');
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};
