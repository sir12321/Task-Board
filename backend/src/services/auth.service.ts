import prisma from '../utils/prisma';
import { hashPassword, comparePasswords } from '../utils/hash.util';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from '../utils/jwt.util';
import { User } from '@prisma/client';

export interface RegisterInput {
    email: string;
    password: string;
    name: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export const registerUser = async (data: RegisterInput): Promise<User> => {
    const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
    });

    if (existingUser) {
        throw new Error('Email already in use');
    }

    const hashedPassword = await hashPassword(data.password);

    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    const newUser = await prisma.user.create({
        data: {
            email: data.email,
            password: hashedPassword,
            name: data.name,
            globalRole: isFirstUser ? 'GLOBAL_ADMIN' : 'USER',
        },
    });

    return newUser;
};

export const loginUser = async (data: LoginInput): Promise<{ user: User; accessToken: string; refreshToken: string }> => {
    const user = await prisma.user.findUnique({
        where: { email: data.email },
    });

    if (!user) {
        throw new Error('Invalid email or password');
    }

    const isPasswordValid = await comparePasswords(data.password, user.password);

    if (!isPasswordValid) {
        throw new Error('Invalid email or password');
    }

    const payload = { userId: user.id, globalRole: user.globalRole };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
    });

    return { user, accessToken, refreshToken };
};

export const refreshSession = async (token: string): Promise<{ accessToken: string }> => {
    const decoded = verifyRefreshToken(token) as { userId: string };

    const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
    });

    if (!user || user.refreshToken !== token) {
        throw new Error('Invalid refresh token');
    }

    const payload = { userId: user.id, globalRole: user.globalRole };
    const newAccessToken = generateAccessToken(payload);

    return { accessToken: newAccessToken };
};

export const logoutUser = async (userId: string): Promise<void> => {
    await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
    });
}