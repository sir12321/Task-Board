import { Response } from "express";
import { makeTask, moveTask, removeTask } from "../services/task.service";
import { AuthRequest } from "./auth.controller";

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

export const updateColumn = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const { targetColumnId: cId } = req.body;
        const userId = req.user?.id;
        const globalRole = req.user?.globalRole;

        if (!id || typeof id != "string" || !userId) {
            res.status(400).json({ error: "Invalid request" });
            return;
        }

        const task = await moveTask(id, cId, userId, globalRole);
        res.status(200).json(task);
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message.includes('Target column not found') || err.message.includes('Invalid transition') 
                || err.message.includes('WIP limit') || err.message.includes('Forbidden') 
                || err.message.includes('incomplete subtasks')) {
                res.status(400).json({ error: err.message });
                return;
            }
        }
        res.status(500).json({ error: "Failed to move task" });
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

export const closeTaskHandler = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const userId = req.user?.id;
        const globalRole = req.user?.globalRole;

        if (!id || typeof id != "string" || !userId) {
            res.status(400).json({ error: "Invalid request" });
            return;
        }

        const { closeTask } = await import('../services/task.service');
        const task = await closeTask(id, userId, globalRole);

        res.status(200).json(task);
    } catch (err: unknown) {
        if (err instanceof Error && (err.message.includes('Forbidden') || err.message.includes('incomplete subtasks'))) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(500).json({ error: "Failed to close task" });
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

        const { title, description, priority, dueDate, assigneeId } = req.body;
        const { updateTask } = await import('../services/task.service');

        const task = await updateTask(
            id, 
            { title, description, priority, dueDate, assigneeId }, 
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