import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as memberService from '../../src/services/project-member.service';
import {
    addProjectMember,
    updateProjectMember,
    removeProjectMember,
} from '../../src/controllers/project-member.controller';

vi.mock('../../src/services/project-member.service', () => ({
    addMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
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

    app.post('/api/projects/:projectId/members', mockAuth, addProjectMember);
    app.patch(
        '/api/projects/:projectId/members/:userId',
        mockAuth,
        updateProjectMember,
    );
    app.delete(
        '/api/projects/:projectId/members/:userId',
        mockAuth,
        removeProjectMember,
    );

    return app;
};

const sampleMember = {
    userId: 'user-2',
    projectId: 'proj-1',
    role: 'PROJECT_MEMBER' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('Project Member Controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/projects/:projectId/members', () => {
        it('adds a new member to a project', async () => {
            vi.mocked(memberService.addMember).mockResolvedValue(
                sampleMember as never,
            );

            const res = await request(buildApp('admin-1', 'GLOBAL_ADMIN'))
                .post('/api/projects/proj-1/members')
                .send({ email: 'newguy@example.com', role: 'PROJECT_MEMBER' });

            expect(res.status).toBe(201);
            expect(res.body.role).toBe('PROJECT_MEMBER');
            expect(memberService.addMember).toHaveBeenCalledWith(
                'admin-1',
                'GLOBAL_ADMIN',
                'proj-1',
                'newguy@example.com',
                'PROJECT_MEMBER',
            );
        });

        it('returns 400 when a required field (email or role) is missing', async () => {
            const res = await request(buildApp('admin-1', 'GLOBAL_ADMIN'))
                .post('/api/projects/proj-1/members')
                .send({ email: 'someone@example.com' });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/Missing required/i);
        });

        it('returns 403 when a non-admin tries to add a member', async () => {
            vi.mocked(memberService.addMember).mockRejectedValue(
                new Error('Forbidden: Only Global Admins or Project Admins can manage members.'),
            );

            const res = await request(buildApp('user-1', 'USER'))
                .post('/api/projects/proj-1/members')
                .send({ email: 'someone@example.com', role: 'PROJECT_MEMBER' });

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/Forbidden/i);
        });

        it('returns 404 when the user being added does not exist', async () => {
            vi.mocked(memberService.addMember).mockRejectedValue(
                new Error('User not found'),
            );

            const res = await request(buildApp('admin-1', 'GLOBAL_ADMIN'))
                .post('/api/projects/proj-1/members')
                .send({ email: 'ghost@example.com', role: 'PROJECT_MEMBER' });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('User not found');
        });
    });

    describe('PATCH /api/projects/:projectId/members/:userId', () => {
        it("updates a member's role", async () => {
            vi.mocked(memberService.updateMemberRole).mockResolvedValue({
                ...sampleMember,
                role: 'PROJECT_ADMIN' as const,
            } as never);

            const res = await request(buildApp('admin-1', 'GLOBAL_ADMIN'))
                .patch('/api/projects/proj-1/members/user-2')
                .send({ role: 'PROJECT_ADMIN' });

            expect(res.status).toBe(200);
            expect(res.body.role).toBe('PROJECT_ADMIN');
        });

        it('returns 403 when the requester is not a project admin', async () => {
            vi.mocked(memberService.updateMemberRole).mockRejectedValue(
                new Error('Forbidden: Only Global Admins or Project Admins can manage members.'),
            );

            const res = await request(buildApp('user-1', 'USER'))
                .patch('/api/projects/proj-1/members/user-2')
                .send({ role: 'PROJECT_ADMIN' });

            expect(res.status).toBe(403);
        });

        it('returns 400 when role is missing from the request body', async () => {
            const res = await request(buildApp('admin-1', 'GLOBAL_ADMIN'))
                .patch('/api/projects/proj-1/members/user-2')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/Missing required/i);
        });
    });

    describe('DELETE /api/projects/:projectId/members/:userId', () => {
        it('removes a member from the project', async () => {
            vi.mocked(memberService.removeMember).mockResolvedValue(undefined);

            const res = await request(buildApp('admin-1', 'GLOBAL_ADMIN')).delete(
                '/api/projects/proj-1/members/user-2',
            );

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Member removed successfully');
        });

        it('returns 403 when the requester has no admin rights', async () => {
            vi.mocked(memberService.removeMember).mockRejectedValue(
                new Error('Forbidden: Only Global Admins or Project Admins can manage members.'),
            );

            const res = await request(buildApp('user-1', 'USER')).delete(
                '/api/projects/proj-1/members/user-2',
            );

            expect(res.status).toBe(403);
        });
    });
});
