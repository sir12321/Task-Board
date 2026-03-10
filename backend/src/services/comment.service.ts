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

  const task = await prisma.task.findUnique({ where: { id: data.taskId }, select: { assigneeId: true, title: true } });
  if (task?.assigneeId && task.assigneeId !== data.authorId) {
    await createNotification(task.assigneeId, `New comment on your task: ${task.title}`);
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

  if (comment.authorId !== userId && globalRole !== 'GLOBAL_ADMIN') {
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
  
  if (comment.authorId !== userId && globalRole !== 'GLOBAL_ADMIN') {
    throw new Error('Unauthorized to edit this comment');
  }

  return await prisma.comment.update({
    where: { id: commentId },
    data: { content }
  });
}