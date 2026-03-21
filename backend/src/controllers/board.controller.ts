import { Response } from 'express';
import {
  getBoards,
  createBoard,
  verifyCreationPermission,
  updateBoardWorkflow,
} from '../services/board.service';
import type { BoardWorkflowConfig } from '../utils/workflow.util';
import { AuthRequest } from './auth.controller';

export const getBoard = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const id = req.params.id;

    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Board id is required' });
      return;
    }

    const b = await getBoards(id);

    if (!b) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    res.status(200).json(b);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addBoard = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { projectId, name } = req.body;
    const userId = req.user?.id;
    const globalRole = req.user?.globalRole;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (
      !projectId ||
      typeof projectId !== 'string' ||
      !name ||
      typeof name !== 'string'
    ) {
      res.status(400).json({ error: 'Project id and board name are required' });
      return;
    }

    await verifyCreationPermission(userId, projectId, globalRole);

    const board = await createBoard(projectId, name);
    res.status(201).json(board);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      res.status(403).json({ error: error.message });
      return;
    }

    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
};

export const editBoardWorkflow = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const boardId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const userId = req.user?.id;
    const globalRole = req.user?.globalRole;
    const workflow = req.body as BoardWorkflowConfig;

    if (!userId || !boardId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const board = await updateBoardWorkflow(userId, boardId, workflow, globalRole);
    res.status(200).json(board);
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes('Forbidden') ||
        error.message.includes('Workflow')
      ) {
        res.status(400).json({ error: error.message });
        return;
      }
    }

    console.error('Error updating board workflow:', error);
    res.status(500).json({ error: 'Failed to update board workflow' });
  }
};
