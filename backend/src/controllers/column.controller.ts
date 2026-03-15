import { Response } from 'express';
import * as columnService from '../services/column.service';
import { AuthRequest } from './auth.controller';

export const addColumn = async (req: AuthRequest, res: Response) : Promise<void> => {
    try {
        const userId = req.user?.id;
        const globalRole = req.user?.globalRole;
        const { boardId, name, wipLimit } = req.body;

        if (!userId || !boardId || !name) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        const column = await columnService.createColumn(userId, boardId, name, wipLimit, globalRole);
        res.status(201).json(column);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('Forbidden')) {
            res.status(403).json({ message: err.message });
        } else {
            res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create column' });
        }
    }
};

export const editColumn = async (req: AuthRequest, res: Response) : Promise<void> => {
    try {
        const userId = req.user?.id;
        const globalRole = req.user?.globalRole;
        const columnId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { name, wipLimit } = req.body;
        
        if (!userId || !columnId) {
            res.status(400).json({ error: 'Invalid request' });
            return;
        }

        const column = await columnService.updateColumn(userId, columnId, { name, wipLimit }, globalRole);
        res.status(200).json(column);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('Forbidden')) {
            res.status(403).json({ error: err.message });
        } else {
            res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update column' });
        }
    }
};

export const removeColumn = async (req: AuthRequest, res: Response) : Promise<void> => {
    try {
        const userId = req.user?.id;
        const globalRole = req.user?.globalRole;
        const columnId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        if (!userId || !columnId) {
            res.status(400).json({ error: 'Invalid request' });
            return;
        }

        await columnService.deleteColumn(userId, columnId, globalRole);
        res.status(200).json({ message: 'Column deleted successfully' });
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('Forbidden')) {
            res.status(403).json({ error: err.message });
        } else {
            res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete column' });
        }
    }
};

export const reorderColumn = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const globalRole = req.user?.globalRole;
        const columnId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { direction } = req.body;

        if (!userId || !columnId || !['left', 'right'].includes(direction)) {
            res.status(400).json({ error: 'Invalid request: direction must be "left" or "right"' });
            return;
        }

        await columnService.reorderColumn(userId, columnId, direction, globalRole);
        res.status(200).json({ message: 'Column reordered successfully' });
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('Forbidden')) {
            res.status(403).json({ error: err.message });
        } else {
            res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to reorder column' });
        }
    }
};