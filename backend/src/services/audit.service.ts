import prisma from '../utils/prisma';

export const logAct = async (
  tId: string,
  uId: string,
  act: string,
  oldV?: string,
  newV?: string,
): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        taskId: tId,
        userId: uId,
        action: act,
        oldValue: oldV,
        newValue: newV,
      },
    });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};
