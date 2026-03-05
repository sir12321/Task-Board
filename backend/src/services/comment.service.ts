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