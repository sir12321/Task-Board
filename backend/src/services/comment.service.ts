import prisma from '../utils/prisma';
import { Comment } from '@prisma/client';
import { createNotification } from './notification.service';
import {
  getRichTextNotificationSnippet,
  getRichTextPlainText,
  sanitizeRichTextComment,
} from '../utils/richText.util';
import { resolveMentionedUserIds } from '../utils/mention.util';

export const makeComment = async (data: {
  content: string;
  authorId: string;
  taskId: string;
}): Promise<Comment> => {
  const sanitizedContent = sanitizeRichTextComment(data.content);
  const plainTextContent = getRichTextPlainText(sanitizedContent);

  if (!plainTextContent) {
    throw new Error('Comment content cannot be empty');
  }

  const comment = await prisma.comment.create({
    data: {
      content: sanitizedContent,
      authorId: data.authorId,
      taskId: data.taskId,
    },
  });
  const task = await prisma.task.findUnique({
    where: { id: data.taskId },
    select: {
      assigneeId: true,
      reporterId: true,
      title: true,
      board: {
        select: { projectId: true },
      },
    },
  });

  if (task) {
    const recipients = new Set<string>([
      ...(task.assigneeId ? [task.assigneeId] : []),
      task.reporterId,
    ]);
    const mentionedUserIds = await resolveMentionedUserIds(
      sanitizedContent,
      task.board.projectId,
    );

    recipients.delete(data.authorId);
    mentionedUserIds.forEach((userId) => recipients.delete(userId));

    await Promise.all(
      mentionedUserIds
        .filter((userId) => userId !== data.authorId)
        .map((recipientId) =>
          createNotification(
            recipientId,
            `You were mentioned in a comment on task "${task.title}": ${getRichTextNotificationSnippet(sanitizedContent)}`,
          ),
        ),
    );

    await Promise.all(
      Array.from(recipients).map((recipientId) =>
        createNotification(
          recipientId,
          `New comment on task "${task.title}": ${getRichTextNotificationSnippet(sanitizedContent)}`,
        ),
      ),
    );
  }

  return comment;
};

export const deleteComment = async (
  commentId: string,
  userId: string,
  globalRole?: string,
): Promise<void> => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
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

export const editComment = async (
  commentId: string,
  userId: string,
  content: string,
  globalRole?: string,
): Promise<Comment> => {
  const sanitizedContent = sanitizeRichTextComment(content);
  const plainTextContent = getRichTextPlainText(sanitizedContent);

  if (!plainTextContent) {
    throw new Error('Comment content cannot be empty');
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });

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
    data: { content: sanitizedContent },
  });
};
