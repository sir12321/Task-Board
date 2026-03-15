import prisma from '../utils/prisma';
import { Comment } from '@prisma/client';
import { createNotification } from './notification.service';

export const makeComment = async (data: {
  content: string;
  authorId: string;
  taskId: string;
}): Promise<Comment> => {
  const comment = await prisma.comment.create({
    data: {
      content: data.content,
      authorId: data.authorId,
      taskId: data.taskId
    }
  });
  const task = await prisma.task.findUnique({
    where: { id: data.taskId },
    select: {
      assigneeId: true,
      reporterId: true,
      title: true,
      board: { select: { projectId: true } },
    },
  });

  if (task) {
    const projectAdmins = await prisma.projectMember.findMany({
      where: {
        projectId: task.board.projectId,
        role: 'PROJECT_ADMIN',
      },
      select: { userId: true },
    });

    const recipients = new Set<string>([
      ...(task.assigneeId ? [task.assigneeId] : []),
      task.reporterId,
      ...projectAdmins.map((member) => member.userId),
    ]);

    recipients.delete(data.authorId);

    await Promise.all(
      Array.from(recipients).map((recipientId) =>
        createNotification(
          recipientId,
          `New comment on task "${task.title}": ${data.content}`,
        ),
      ),
    );
  }

  return comment;
};

export const deleteComment = async (commentId: string, userId: string, globalRole?: string): Promise<void> => {
  const comment = await prisma.comment.findUnique({ 
    where: { id: commentId }, 
    select: { authorId: true } 
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  const isAuthor = comment.authorId === userId;
  const isGlobalAdmin = globalRole === 'GLOBAL_ADMIN';

  if (!isAuthor && !isGlobalAdmin) {
    throw new Error('Unauthorized to delete this comment');
  }

  await prisma.comment.delete({ where: { id: commentId } });
};

export const editComment = async (commentId: string, userId: string, content: string, globalRole?: string): Promise<Comment> => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true }
  })

  if (!comment) {
    throw new Error('Comment not found');
  }
  
  const isAuthor = comment.authorId === userId;
  const isGlobalAdmin = globalRole === 'GLOBAL_ADMIN';

  if (!isAuthor && !isGlobalAdmin) {
    throw new Error('Unauthorized to edit this comment');
  }

  return await prisma.comment.update({
    where: { id: commentId },
    data: { content }
  });
}