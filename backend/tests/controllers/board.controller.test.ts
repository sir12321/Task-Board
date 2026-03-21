import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReset } from 'vitest-mock-extended';
import pMock from '../mocks/prisma';
import * as boardService from '../../src/services/board.service';
import { getBoard, addBoard } from '../../src/controllers/board.controller';

vi.mock('../../src/utils/prisma', () => ({
    default: pMock,
}));

vi.mock('../../src/services/board.service', () => ({
    getBoards: vi.fn(),
    createBoard: vi.fn(),
    verifyCreationPermission: vi.fn(),
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

    app.get('/api/boards/:id', mockAuth, getBoard);
    app.post('/api/boards', mockAuth, addBoard);

    return app;
};

const sampleBoard = {
    id: 'board-1',
    name: 'Main Board',
    projectId: 'proj-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    columns: [],
    tasks: [],
};

describe('Board Controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockReset(pMock);
    });

    describe('GET /api/boards/:id', () => {
        it('returns the board when it exists', async () => {
            vi.mocked(boardService.getBoards).mockResolvedValue(sampleBoard as never);

            const app = buildApp('user-1');
            const res = await request(app).get('/api/boards/board-1');

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Main Board');
        });

        it('returns 404 when the board is not found', async () => {
            vi.mocked(boardService.getBoards).mockResolvedValue(null);

            const app = buildApp('user-1');
            const res = await request(app).get('/api/boards/does-not-exist');

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Board not found');
        });
    });

    describe('POST /api/boards', () => {
        it('creates a board when the user is authorised', async () => {
            vi.mocked(boardService.verifyCreationPermission).mockResolvedValue(
                undefined,
            );
            vi.mocked(boardService.createBoard).mockResolvedValue(
                sampleBoard as never,
            );

            const app = buildApp('admin-1', 'GLOBAL_ADMIN');
            const res = await request(app)
                .post('/api/boards')
                .send({ projectId: 'proj-1', name: 'Sprint Board' });

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Main Board');
            expect(boardService.createBoard).toHaveBeenCalledWith(
                'proj-1',
                'Sprint Board',
            );
        });

        it('returns 401 when the request carries no user', async () => {
            const app = buildApp();
            const res = await request(app)
                .post('/api/boards')
                .send({ projectId: 'proj-1', name: 'Sprint Board' });

            expect(res.status).toBe(401);
        });

        it('returns 400 when projectId or name is missing', async () => {
            const app = buildApp('user-1');
            const res = await request(app)
                .post('/api/boards')
                .send({ name: 'No Project' });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/required/i);
        });

        it('returns 403 when the user lacks permission to create boards', async () => {
            vi.mocked(boardService.verifyCreationPermission).mockRejectedValue(
                new Error('Forbidden: Only project admins can create boards'),
            );

            const app = buildApp('user-1', 'USER');
            const res = await request(app)
                .post('/api/boards')
                .send({ projectId: 'proj-1', name: 'No Access Board' });

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/Forbidden/i);
        });
    });
});
