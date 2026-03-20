import prisma from '../utils/prisma';
import { ProjectMember, ProjectRole } from '@prisma/client';

const verifyAccess = async (
  requesterId: string,
  projectId: string,
  globalRole?: string,
): Promise<void> => {
  if (globalRole === 'GLOBAL_ADMIN') return;

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: requesterId, projectId } },
  });

  if (!member || member.role !== 'PROJECT_ADMIN') {
    throw new Error(
      'Forbidden: Only Global Admins or Project Admins can manage members.',
    );
  }
};

export const addMember = async (
  requesterId: string,
  globalRole: string | undefined,
  projectId: string,
  email: string,
  role: ProjectRole,
): Promise<ProjectMember> => {
  await verifyAccess(requesterId, projectId, globalRole);

  const userToAdd = await prisma.user.findUnique({ where: { email } });
  if (!userToAdd) {
    throw new Error('User not found');
  }

  return prisma.projectMember.create({
    data: {
      projectId,
      userId: userToAdd.id,
      role,
    },
  });
};

export const updateMemberRole = async (
  requesterId: string,
  globalRole: string | undefined,
  projectId: string,
  targetUserId: string,
  newRole: ProjectRole,
): Promise<ProjectMember> => {
  await verifyAccess(requesterId, projectId, globalRole);

  return prisma.projectMember.update({
    where: { userId_projectId: { userId: targetUserId, projectId } },
    data: { role: newRole },
  });
};

export const removeMember = async (
  requesterId: string,
  globalRole: string | undefined,
  projectId: string,
  targetUserId: string,
): Promise<void> => {
  await verifyAccess(requesterId, projectId, globalRole);

  await prisma.projectMember.delete({
    where: { userId_projectId: { userId: targetUserId, projectId } },
  });
};
