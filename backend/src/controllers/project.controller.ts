import { Response } from 'express';
import { getUserProjects, createProject } from '../services/project.service';
import { AuthRequest } from './auth.controller';

export const getProjects = async (req: AuthRequest, res: Response) : Promise<void> => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const projects = await getUserProjects(userId);
        res.status(200).json(projects);
    } catch {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};

export const createNewProject = async (req: AuthRequest, res: Response) : Promise<void> => {
    try {
        const userId = req.user?.id;
        const { name, description } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (! name) {
            res.status(400).json({ error: 'Project name is required' });
            return;
        }

        const project = await createProject(userId, {name, description});
        res.status(201).json(project);
    } catch {
        res.status(500).json({ error: 'Failed to create project' });
    }
};