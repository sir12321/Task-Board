import { UserProfile } from '../types/Types';
import prisma from '../utils/prisma';

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
