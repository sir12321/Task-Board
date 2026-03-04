import prisma from '../utils/prisma';

export const makeComment = async (data: {
    content: string;
    authorId: string;
    taskId: string;
}) => {
  return await prisma.comment.create({
    data: {
      content: data.content,
      authorId: data.authorId,
      taskId: data.taskId
    }
  });
};