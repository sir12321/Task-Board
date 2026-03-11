import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
};

export interface AuthRequest extends Request {
    user?: {
        id: string;
        globalRole: string;
    };
}

export const register = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
    try {
        const { email, password, name } = req.body;
        const newUser = await authService.registerUser({ email, password, name });
        const safeUser = {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            avatarUrl: newUser.avatarUrl,
            globalRole: newUser.globalRole,
            notifications: [],
        };

        res.status(201).json({
            message: 'User registered successfully',
            user: safeUser,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
            res.status(409).json({ message: error.message });
            return;
        }
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
    try {
        const { email, password } = req.body;
        const { user, accessToken, refreshToken } = await authService.loginUser({ email, password });
        const safeUser = await authService.getAuthUserById(user.id);
        if (!safeUser) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.status(200).json({
            message: 'Login successful',
            user: safeUser,
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid email or password') {
            res.status(401).json({ error: error.message });
            return;
        }
        next(error);
    }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) {
            res.status(401).json({ error: 'Refresh token missing' });
            return;
        }

        const { accessToken, user } = await authService.refreshSession(refreshToken);

        res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 minutes

        res.status(200).json({ message: 'Session refreshed successfully', user });
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid refresh token') {
            res.status(403).json({ error: error.message });
            return;
        }
        next(error);
    }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) : Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        
        await authService.logoutUser(userId);

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        next(error);
    }
};