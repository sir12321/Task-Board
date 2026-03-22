import prisma from './prisma';

export const touchProject = async (projectId: string): Promise<void> => {
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });
  } catch {
    console.error(`Failed to touch project ${projectId}`);
  }
};

export const touchProjectByBoardId = async (boardId: string): Promise<void> => {
  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { projectId: true },
    });

    if (board) {
      await touchProject(board.projectId);
    }
  } catch {
    console.error(`Failed to touch project for board ${boardId}`);
  }
};
