import { Response } from 'express';
import prisma from '../utils/prisma';
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

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: { board: { select: { projectId: true } } },
        });
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        const member = await prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: authorId,
                    projectId: task.board.projectId,
                },
            },
        });
        if (!member) {
            res.status(403).json({ error: 'Forbidden: You are not a member of this project' });
            return;
        }
        if (member.role === 'PROJECT_VIEWER') {
            res.status(403).json({ error: 'Forbidden: Viewers cannot add comments' });
            return;
        }

        const comment = await makeComment({content, authorId, taskId});
        res.status(201).json(comment);
    } catch {
        res.status(500).json({ error: 'Failed to create comment' });
    }
};
