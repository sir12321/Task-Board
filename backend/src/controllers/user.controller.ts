import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from './auth.controller';
import { updateAvatar } from '../services/user.service';

export const listUsers = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        globalRole: true,
        avatarUrl: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.status(200).json(users);
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const updateUserAvatar = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const file = req.file;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const avatarUrl = `/uploads/${file.filename}`;
    const updatedUser = await updateAvatar(userId, avatarUrl);
    res.status(200).json({
      message: 'Avatar updated successfully',
      avatarUrl,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
};
