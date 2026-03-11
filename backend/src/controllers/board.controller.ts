import { Response } from 'express';
import { getBoards, createBoard } from '../services/board.service';
import { AuthRequest } from './auth.controller';

export const getBoard = async (req: AuthRequest, res: Response) : Promise<void> => {
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

export const addBoard = async (req: AuthRequest, res: Response) : Promise<void> => {
    try {
        const { projectId, name } = req.body;
        
        if (!projectId || typeof projectId !== 'string' || !name || typeof name !== 'string') {
            res.status(400).json({ error: 'Project id and board name are required' });
            return;
        }

        const board = await createBoard(projectId, name);
        res.status(201).json(board);
    } catch (error) {
        console.error("Error creating board:", error);
        res.status(500).json({ error: 'Failed to create board' });
    }
};