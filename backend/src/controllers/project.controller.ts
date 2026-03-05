import { Response } from 'express';
import { getUserProjects, createProject } from '../services/project.service';
import { AuthRequest } from './auth.controller';

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
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

export const createNewProject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { name, description } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (req.user?.globalRole !== 'GLOBAL_ADMIN') {
            res.status(403).json({ error: 'Forbidden: Only Global Admins can create projects.' });
            return;
        }

        if (!name) {
            res.status(400).json({ error: 'Project name is required' });
            return;
        }

        const project = await createProject(userId, { name, description });
        res.status(201).json(project);
    } catch {
        res.status(500).json({ error: 'Failed to create project' });
    }
};

export const archiveProjectHandler = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const globalRole = req.user?.globalRole;
        const projectId = req.params.id;

        if (!userId || !globalRole) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }

        // We use dynamic require or simply import the function at the top. Let's rely on the import.
        // Wait, the file is imported as { getUserProjects, createProject }. We need to update that import too.
        // To avoid messing up the import block right here, I will do a multi_replace for imports, or just let TS resolve it if I fix the import.
        const { archiveProject } = await import('../services/project.service');
        const project = await archiveProject(userId, projectId as string, globalRole);

        res.status(200).json({ message: 'Project archived successfully', project });
    } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('Forbidden')) {
            res.status(403).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to archive project' });
        }
    }
};