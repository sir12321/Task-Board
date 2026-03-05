import { Response } from "express";
import { makeTask, moveTask, removeTask } from "../services/task.service";
import { AuthRequest } from "./auth.controller";

export const createTask = async (req: AuthRequest, res: Response) : Promise<void> => {
    try {
        const data = req.body;
        const task = await makeTask(data);
        res.status(201).json(task);
    } catch (err : unknown) {
        if (err instanceof Error && err.message === 'Assignee must be a member of the project') {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(500).json({ error: "Failed to create task" });
    }
};

export const updateColumn = async (req: AuthRequest, res: Response) : Promise<void> => {
    try {
        const id = req.params.id;
        const { targetColumnId: cId } = req.body;

        if (!id || typeof id != "string") {
            res.status(400).json({ error: "Invalid task ID" });
            return;
        }

        const task = await moveTask(id, cId);
        res.status(200).json(task);
    } catch (err : unknown) {
        if (err instanceof Error && err.message === 'Target column not found') {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(500).json({ error: "Failed to move task" });
    }
};

export const deleteTask = async (req: AuthRequest, res: Response) : Promise<void> => {
    try {
        const id = req.params.id;

        if (!id || typeof id != "string") {
            res.status(400).json({ error: "Invalid task ID" });
            return;
        }

        await removeTask(id);
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (err : unknown) {
        if (err instanceof Error) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(500).json({ error: "Failed to delete task" });
        }
    }
};