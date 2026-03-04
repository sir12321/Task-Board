import { Response } from 'express';
import { getBoards } from '../services/board.service';
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