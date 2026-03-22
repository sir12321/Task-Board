import prisma from '../utils/prisma';
import { Comment } from '@prisma/client';
import { createNotification } from './notification.service';
import { touchProject, touchProjectByBoardId } from '../utils/touchProject.util';
import {
  getRichTextPlainText,
  correctRichTextComment,
} from '../utils/richText.util';
import { resolveMentionedUserIds } from '../utils/mention.util';

export const makeComment = async (data: {
  content: string;
  authorId: string;
  taskId: string;
}): Promise<Comment> => {
  const sanitizedContent = correctRichTextComment(data.content);
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
      column: {
        select: { name: true },
      },
      board: {
        select: {
          projectId: true,
          name: true,
          project: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (task) {
    const scope = ` [Project: ${task.board.project.name} | Board: ${task.board.name} | Column: ${task.column.name}]`;

    const recipients = new Set<string>([
      ...(task.assigneeId ? [task.assigneeId] : []),
      task.reporterId,
    ]);

    let mentionedUserIds: string[] = [];
    try {
      mentionedUserIds = await resolveMentionedUserIds(
        sanitizedContent,
        task.board.projectId,
      );
    } catch (error) {
      console.error(
        `Failed to resolve mentions for comment ${comment.id}:`,
        error,
      );
    }

    recipients.delete(data.authorId);
    mentionedUserIds.forEach((userId) => recipients.delete(userId));

    await Promise.all(
      mentionedUserIds
        .filter((userId) => userId !== data.authorId)
        .map((recipientId) =>
          createNotification(
            recipientId,
            `You were mentioned in a comment on task "${task.title}":\n${sanitizedContent}\n${scope}`,
          ),
        ),
    );

    await Promise.all(
      Array.from(recipients).map((recipientId) =>
        createNotification(
          recipientId,
          `New comment on task "${task.title}":\n${sanitizedContent}\n${scope}`,
        ),
      ),
    );
  }

  if (task?.board?.projectId) {
    await touchProject(task.board.projectId);
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

  const deletedComment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      task: {
        select: { boardId: true },
      },
    },
  });

  await prisma.comment.delete({ where: { id: commentId } });

  if (deletedComment?.task?.boardId) {
    await touchProjectByBoardId(deletedComment.task.boardId);
  }
};

export const editComment = async (
  commentId: string,
  userId: string,
  content: string,
  globalRole?: string,
): Promise<Comment> => {
  const sanitizedContent = correctRichTextComment(content);
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

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content: sanitizedContent },
    include: {
      task: {
        select: { boardId: true },
      },
    },
  });

  if (updated.task?.boardId) {
    await touchProjectByBoardId(updated.task.boardId);
  }

  return updated;
};
