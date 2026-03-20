import { Response } from 'express';
import { AuthRequest } from './auth.controller';
import {
  addMember,
  updateMemberRole,
  removeMember,
} from '../services/project-member.service';
import { ProjectRole } from '@prisma/client';

export const addProjectMember = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const requesterId = req.user?.id;
    const globalRole = req.user?.globalRole;
    const { projectId } = req.params;
    const { email, role } = req.body;

    if (!requesterId || !projectId || !email || !role) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const member = await addMember(
      requesterId,
      globalRole,
      projectId as string,
      email,
      role as ProjectRole,
    );
    res.status(201).json(member);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      res.status(403).json({ error: error.message });
    } else if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to add member' });
    }
  }
};

export const updateProjectMember = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const requesterId = req.user?.id;
    const globalRole = req.user?.globalRole;
    const { projectId, userId } = req.params;
    const { role } = req.body;

    if (!requesterId || !projectId || !userId || !role) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const updated = await updateMemberRole(
      requesterId,
      globalRole,
      projectId as string,
      userId as string,
      role as ProjectRole,
    );
    res.status(200).json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update member role' });
    }
  }
};

export const removeProjectMember = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const requesterId = req.user?.id;
    const globalRole = req.user?.globalRole;
    const { projectId, userId } = req.params;

    if (!requesterId || !projectId || !userId) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    await removeMember(
      requesterId,
      globalRole,
      projectId as string,
      userId as string,
    );
    res.status(200).json({ message: 'Member removed successfully' });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to remove member' });
    }
  }
};
