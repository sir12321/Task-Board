import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from './auth.controller';

export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user?.id) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                globalRole: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        res.status(200).json(users);
    } catch {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};
