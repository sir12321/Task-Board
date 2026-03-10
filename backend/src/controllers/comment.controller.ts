import { Response } from 'express';
import prisma from '../utils/prisma';
import { makeComment, deleteComment, editComment } from '../services/comment.service';
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

export const removeComment = async (req: AuthRequest, res: Response) : Promise<void> => {
    try {
        const commentId = req.params.id;
        const userId = req.user?.id;
        const globalRole = req.user?.globalRole;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (!commentId || typeof commentId !== 'string') {
            res.status(400).json({ error: 'Missing comment ID' });
            return;
        }

        await deleteComment(commentId, userId, globalRole);
        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (err : unknown) {
        if (err instanceof Error && err.message.includes('Unauthorized')) {
            res.status(403).json({ error: err.message });
        } else {
            res.status(400).json({ error: "Failed to delete comment" });
        }
    }
};

export const updateComment = async (req: AuthRequest, res: Response) : Promise<void> => {
    try {
        const commentId = req.params.id;
        const userId = req.user?.id;
        const globalRole = req.user?.globalRole;
        const { content } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        
        if (!commentId || typeof commentId !== 'string' || !content || typeof content !== 'string') {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const updatedComment = await editComment(commentId, userId, content, globalRole);
        res.status(200).json(updatedComment);
    } catch (err : unknown) {
        if (err instanceof Error && err.message.includes('Unauthorized')) {
            res.status(403).json({ error: err.message });
        } else {
            res.status(400).json({ error: "Failed to edit comment" });
        }
    }
};