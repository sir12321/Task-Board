import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from './auth.controller';
import {
  updateName,
  updatePassword,
  updateGlobalRole,
} from '../services/user.service';
import { GlobalRole } from '@prisma/client';

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
    const { avatarUrl: aUrl } = req.body;

    if (!userId || !aUrl || typeof aUrl !== 'string') {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: aUrl },
    });
    res.status(200).json({
      avatarUrl: updatedUser.avatarUrl,
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
};

export const changeName = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const updatedUser = await updateName(userId, name);
    res.status(200).json({
      message: 'Name updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating name:', error);
    res.status(500).json({ error: 'Failed to update name' });
  }
};

export const changePassword = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new passwords are required' });
      return;
    }

    await updatePassword(userId, currentPassword, newPassword);
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);

    if (error instanceof Error) {
      if (error.message.includes('Current password is incorrect')) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error.message.includes('User not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
    }

    res.status(500).json({ error: 'Failed to update password' });
  }
};

export const changeGlobalRole = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const requesterRole = req.user?.globalRole;
    const targetUserId = req.params.id;
    const { globalRole } = req.body as { globalRole?: GlobalRole };

    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (requesterRole !== 'GLOBAL_ADMIN') {
      res
        .status(403)
        .json({ error: 'Forbidden: Global admin access required' });
      return;
    }

    if (!targetUserId || typeof targetUserId !== 'string') {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    if (globalRole !== 'GLOBAL_ADMIN' && globalRole !== 'USER') {
      res.status(400).json({ error: 'Invalid global role' });
      return;
    }

    const updatedUser = await updateGlobalRole(targetUserId, globalRole);

    res.status(200).json({
      message: 'Global role updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('At least one global admin')) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error.message.includes('User not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
    }

    res.status(500).json({ error: 'Failed to update global role' });
  }
};
