import { Response } from "express";
import { makeTask, moveTask, removeTask } from "../services/task.service";
import { AuthRequest } from "./auth.controller";
import { createNotification } from '../services/notification.service';

const notifyStatusChange = async (task: {
    title: string;
    assigneeId: string | null;
    reporterId: string;
}, actorUserId?: string): Promise<void> => {
    const recipientIds = new Set<string>();
    if (task.assigneeId) {
        recipientIds.add(task.assigneeId);
    }
    if (task.reporterId) {
        recipientIds.add(task.reporterId);
    }

    if (actorUserId) {
        recipientIds.delete(actorUserId);
    }

    if (recipientIds.size === 0) {
        return;
    }

    await Promise.all(
        Array.from(recipientIds).map((userId) =>
            createNotification(userId, `Status changed on task: ${task.title}`),
        ),
    );
};

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const reporterId = req.user?.id;
        const globalRole = req.user?.globalRole;

        if (!reporterId || typeof reporterId != "string") {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const task = await makeTask(req.body, reporterId, globalRole);
        res.status(201).json(task);
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.includes('Assignee must be') || err.message.includes('Forbidden') || err.message.includes('WIP limit')) {
                res.status(400).json({ error: err.message });
                return;
            }
        }
        res.status(500).json({ error: "Failed to create task" });
    }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const userId = req.user?.id;
        const globalRole = req.user?.globalRole;

        if (!id || typeof id != "string" || !userId) {
            res.status(400).json({ error: "Invalid request" });
            return;
        }

        await removeTask(id, userId, globalRole);
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.includes('Forbidden') || err.message.includes('subtasks')) {
                res.status(400).json({ error: err.message });
                return;
            }
        }
        res.status(500).json({ error: "Failed to delete task" });
    }
};


export const updateTaskStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const userId = req.user?.id;
        const globalRole = req.user?.globalRole;
        const { targetColumnId, close } = req.body;

        if (!id || typeof id !== 'string' || !userId) {
            res.status(400).json({ error: 'Invalid request' });
            return;
        }

        if (close === true) {
            const { closeTask } = await import('../services/task.service');
            const task = await closeTask(id, userId, globalRole);
            await notifyStatusChange(task, userId);
            res.status(200).json(task);
            return;
        }

        if (targetColumnId && typeof targetColumnId === 'string') {
            const task = await moveTask(id, targetColumnId, userId, globalRole);
            await notifyStatusChange(task, userId);
            res.status(200).json(task);
            return;
        }

        res.status(400).json({
            error: 'Provide either `targetColumnId` for move or `close: true` for close',
        });
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (
                err.message.includes('Target column not found') ||
                err.message.includes('Invalid transition') ||
                err.message.includes('WIP limit') ||
                err.message.includes('Forbidden') ||
                err.message.includes('incomplete subtasks')
            ) {
                res.status(400).json({ error: err.message });
                return;
            }
        }
        res.status(500).json({ error: 'Failed to update task status' });
    }
};

export const editTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const userId = req.user?.id;
        const globalRole = req.user?.globalRole;

        if (!id || typeof id != "string" || !userId) {
            res.status(400).json({ error: "Invalid request" });
            return;
        }

        const { title, description, type, priority, dueDate, assigneeId, parentId } = req.body;
        const { updateTask } = await import('../services/task.service');

        const task = await updateTask(
            id, 
            { title, description, type, priority, dueDate, assigneeId, parentId }, 
            userId, 
            globalRole
        );

        res.status(200).json(task);
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.includes('Forbidden') || err.message.includes('Assignee must be')) {
                res.status(400).json({ error: err.message });
                return;
            }
        }
        res.status(500).json({ error: "Failed to update task" });
    }
};