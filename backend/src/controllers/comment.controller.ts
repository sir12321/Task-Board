import { Response } from 'express';
import { makeComment } from '../services/comment.service';
import { AuthRequest } from './auth.controller';

export const createComment = async (req: AuthRequest, res: Response) : Promise<void> => {
    try {
        const { content, taskId } = req.body;
        const authorId = req.user?.id;

        if (!authorId || !content || !taskId) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const comment = await makeComment({content, authorId, taskId});
        res.status(201).json(comment);
    } catch {
        res.status(500).json({ error: 'Failed to create comment' });
    }
};