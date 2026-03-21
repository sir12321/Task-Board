import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import * as projectService from '../../src/services/project.service';
import {
    getProjects,
    createNewProject,
    deleteProjectHandler,
    archiveProjectHandler,
} from '../../src/controllers/project.controller';

vi.mock('../../src/utils/prisma', () => ({
    default: pMock,
}));

vi.mock('../../src/services/project.service', () => ({
    getUserProjects: vi.fn(),
    createProject: vi.fn(),
    deleteProject: vi.fn(),
    archiveProject: vi.fn(),
}));

type GlobalRole = 'USER' | 'GLOBAL_ADMIN';

const buildApp = (userId?: string, globalRole: GlobalRole = 'USER'): express.Express => {
    const app = express();
    app.use(express.json());

    const mockAuth = (req: Request, _res: Response, next: NextFunction): void => {
        if (userId) {
            (req as never as { user: { id: string; globalRole: string } }).user = {
                id: userId,
                globalRole,
            };
        }
        next();
    };

    app.get('/api/projects', mockAuth, getProjects);
    app.post('/api/projects', mockAuth, createNewProject);
    app.delete('/api/projects/:id', mockAuth, deleteProjectHandler);
    app.patch('/api/projects/:id', mockAuth, archiveProjectHandler);

    return app;
};

const sampleProject = {
    id: 'proj-1',
    name: 'My Project',
    description: null,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('Project Controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockReset(pMock);
    });

    describe('GET /api/projects', () => {
        it('returns a list of projects for an authenticated user', async () => {
            vi.mocked(projectService.getUserProjects).mockResolvedValue([
                { ...sampleProject, userRole: 'PROJECT_ADMIN', members: [], boards: [] },
            ]);

            const app = buildApp('user-1');
            const res = await request(app).get('/api/projects');

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0].name).toBe('My Project');
        });

        it('returns 401 when there is no authenticated user', async () => {
            const app = buildApp();
            const res = await request(app).get('/api/projects');

            expect(res.status).toBe(401);
        });

        it('passes globalRole through so admins see all projects', async () => {
            vi.mocked(projectService.getUserProjects).mockResolvedValue([]);

            const app = buildApp('admin-1', 'GLOBAL_ADMIN');
            await request(app).get('/api/projects');

            expect(projectService.getUserProjects).toHaveBeenCalledWith(
                'admin-1',
                'GLOBAL_ADMIN',
            );
        });
    });

    describe('POST /api/projects', () => {
        it('allows GLOBAL_ADMIN to create a project', async () => {
            vi.mocked(projectService.createProject).mockResolvedValue(
                sampleProject as never,
            );

            const app = buildApp('admin-1', 'GLOBAL_ADMIN');
            const res = await request(app)
                .post('/api/projects')
                .send({ name: 'My Project', description: 'desc' });

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('My Project');
        });

        it('blocks a regular USER from creating a project', async () => {
            const app = buildApp('user-1', 'USER');
            const res = await request(app)
                .post('/api/projects')
                .send({ name: 'Sneaky Project' });

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/Forbidden/i);
        });

        it('returns 400 when the project name is missing', async () => {
            const app = buildApp('admin-1', 'GLOBAL_ADMIN');
            const res = await request(app)
                .post('/api/projects')
                .send({ description: 'no name here' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Project name is required');
        });

        it('returns 401 when not authenticated', async () => {
            const app = buildApp();
            const res = await request(app).post('/api/projects').send({ name: 'Proj' });

            expect(res.status).toBe(401);
        });
    });

    describe('DELETE /api/projects/:id', () => {
        it('deletes a project when called by a GLOBAL_ADMIN', async () => {
            vi.mocked(projectService.deleteProject).mockResolvedValue(undefined);

            const app = buildApp('admin-1', 'GLOBAL_ADMIN');
            const res = await request(app).delete('/api/projects/proj-1');

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Project deleted successfully');
        });

        it('returns 403 when a regular user tries to delete a project', async () => {
            vi.mocked(projectService.deleteProject).mockRejectedValue(
                new Error('Forbidden: Only Global Admins can delete projects.'),
            );

            const app = buildApp('user-1', 'USER');
            const res = await request(app).delete('/api/projects/proj-1');

            expect(res.status).toBe(403);
        });

        it('returns 404 when the project does not exist', async () => {
            vi.mocked(projectService.deleteProject).mockRejectedValue(
                new Error('Project not found'),
            );

            const app = buildApp('admin-1', 'GLOBAL_ADMIN');
            const res = await request(app).delete('/api/projects/ghost');

            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /api/projects/:id', () => {
        it('archives a project successfully', async () => {
            vi.mocked(projectService.archiveProject).mockResolvedValue({
                ...sampleProject,
                isArchived: true,
            } as never);

            const app = buildApp('admin-1', 'GLOBAL_ADMIN');
            const res = await request(app)
                .patch('/api/projects/proj-1')
                .send({ isArchived: true });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Project updated successfully');
        });

        it('returns 403 when a non-admin tries to archive', async () => {
            vi.mocked(projectService.archiveProject).mockRejectedValue(
                new Error(
                    'Forbidden: Only Global Admins or Project Admins can archive projects.',
                ),
            );

            const app = buildApp('user-1', 'USER');
            const res = await request(app)
                .patch('/api/projects/proj-1')
                .send({ isArchived: true });

            expect(res.status).toBe(403);
        });
    });
});
