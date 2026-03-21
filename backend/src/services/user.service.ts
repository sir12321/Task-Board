import { UserProfile } from '../types/Types';
import prisma from '../utils/prisma';
import { hashPassword, comparePasswords } from '../utils/hash.util';
import { GlobalRole } from '@prisma/client';

export const updateName = async (
  userId: string,
  name: string,
): Promise<UserProfile> => {
  return await prisma.user.update({
    where: { id: userId },
    data: { name },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  });
};

export const updatePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const isValidPassword = await comparePasswords(
    currentPassword,
    user.password,
  );

  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
};

export const updateGlobalRole = async (
  userId: string,
  nextRole: GlobalRole,
): Promise<UserProfile & { id: string; globalRole: GlobalRole }> => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      globalRole: true,
    },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  if (
    existingUser.globalRole === 'GLOBAL_ADMIN' &&
    nextRole !== 'GLOBAL_ADMIN'
  ) {
    const globalAdminCount = await prisma.user.count({
      where: { globalRole: 'GLOBAL_ADMIN' },
    });

    if (globalAdminCount <= 1) {
      throw new Error('At least one global admin is required');
    }
  }

  return await prisma.user.update({
    where: { id: userId },
    data: { globalRole: nextRole },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      globalRole: true,
    },
  });
};
