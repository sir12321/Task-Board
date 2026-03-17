import { UserProfile } from '../types/Types';
import prisma from '../utils/prisma';
import { hashPassword, comparePasswords } from '../utils/hash.util';

export const updateAvatar = async (
  userId: string,
  avatarUrl: string,
): Promise<UserProfile> => {
  return await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  });
};

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
