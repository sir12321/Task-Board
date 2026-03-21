import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import * as columnService from '../../src/services/column.service';
import {
    addColumn,
    editColumn,
    removeColumn,
    reorderColumn,
} from '../../src/controllers/column.controller';

vi.mock('../../src/utils/prisma', () => ({
    default: pMock,
}));

vi.mock('../../src/services/column.service', () => ({
    createColumn: vi.fn(),
    updateColumn: vi.fn(),
    deleteColumn: vi.fn(),
    reorderColumn: vi.fn(),
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

    app.post('/api/columns', mockAuth, addColumn);
    app.patch('/api/columns/:id', mockAuth, editColumn);
    app.delete('/api/columns/:id', mockAuth, removeColumn);
    app.patch('/api/columns/:id/reorder', mockAuth, reorderColumn);

    return app;
};

const sampleColumn = {
    id: 'col-1',
    name: 'To Do',
    order: 1,
    wipLimit: null,
    boardId: 'board-1',
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('Column Controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockReset(pMock);
    });

    describe('POST /api/columns', () => {
        it('creates a column when all fields are present', async () => {
            vi.mocked(columnService.createColumn).mockResolvedValue(
                sampleColumn as never,
            );

            const app = buildApp('admin-1', 'GLOBAL_ADMIN');
            const res = await request(app)
                .post('/api/columns')
                .send({ boardId: 'board-1', name: 'To Do', wipLimit: null });

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('To Do');
            expect(columnService.createColumn).toHaveBeenCalledWith(
                'admin-1',
                'board-1',
                'To Do',
                null,
                'GLOBAL_ADMIN',
            );
        });

        it('returns 400 when required fields are missing', async () => {
            const app = buildApp('user-1');
            const res = await request(app)
                .post('/api/columns')
                .send({ name: 'No Board' });

            expect(res.status).toBe(400);
        });

        it('returns 403 when the user is not a project admin', async () => {
            vi.mocked(columnService.createColumn).mockRejectedValue(
                new Error(
                    'Forbidden: Only Global Admins or Project Admins can perform this action.',
                ),
            );

            const app = buildApp('user-1', 'USER');
            const res = await request(app)
                .post('/api/columns')
                .send({ boardId: 'board-1', name: 'Sneaky Column', wipLimit: null });

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/Forbidden/i);
        });
    });

    describe('PATCH /api/columns/:id', () => {
        it('updates a column name and wipLimit', async () => {
            vi.mocked(columnService.updateColumn).mockResolvedValue({
                ...sampleColumn,
                name: 'In Progress',
                wipLimit: 5,
            } as never);

            const app = buildApp('admin-1', 'GLOBAL_ADMIN');
            const res = await request(app)
                .patch('/api/columns/col-1')
                .send({ name: 'In Progress', wipLimit: 5 });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('In Progress');
        });

        it('returns 403 when a non-admin tries to edit', async () => {
            vi.mocked(columnService.updateColumn).mockRejectedValue(
                new Error(
                    'Forbidden: Only Global Admins or Project Admins can perform this action.',
                ),
            );

            const app = buildApp('user-1', 'USER');
            const res = await request(app)
                .patch('/api/columns/col-1')
                .send({ name: 'Blocked Column' });

            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /api/columns/:id', () => {
        it('deletes a column successfully', async () => {
            vi.mocked(columnService.deleteColumn).mockResolvedValue(undefined);

            const app = buildApp('admin-1', 'GLOBAL_ADMIN');
            const res = await request(app).delete('/api/columns/col-1');

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Column deleted successfully');
        });

        it('returns 403 when a regular user tries to delete', async () => {
            vi.mocked(columnService.deleteColumn).mockRejectedValue(
                new Error(
                    'Forbidden: Only Global Admins or Project Admins can perform this action.',
                ),
            );

            const app = buildApp('user-1', 'USER');
            const res = await request(app).delete('/api/columns/col-1');

            expect(res.status).toBe(403);
        });
    });

    describe('PATCH /api/columns/:id/reorder', () => {
        it('reorders a column to the left', async () => {
            vi.mocked(columnService.reorderColumn).mockResolvedValue(undefined);

            const app = buildApp('admin-1', 'GLOBAL_ADMIN');
            const res = await request(app)
                .patch('/api/columns/col-1/reorder')
                .send({ direction: 'left' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Column reordered successfully');
        });

        it('reorders a column to the right', async () => {
            vi.mocked(columnService.reorderColumn).mockResolvedValue(undefined);

            const app = buildApp('admin-1', 'GLOBAL_ADMIN');
            const res = await request(app)
                .patch('/api/columns/col-1/reorder')
                .send({ direction: 'right' });

            expect(res.status).toBe(200);
        });

        it('returns 400 when direction is something other than left or right', async () => {
            const app = buildApp('admin-1', 'GLOBAL_ADMIN');
            const res = await request(app)
                .patch('/api/columns/col-1/reorder')
                .send({ direction: 'up' });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/direction must be/i);
        });
    });
});
