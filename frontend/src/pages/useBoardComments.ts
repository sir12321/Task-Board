import { useCallback, useRef } from 'react';
import type { Board, ProjectDetails } from '../types/Types';
import { apiClient } from '../utils/api';

export function useBoardComments(
  board: Board | null,
  project: ProjectDetails | null,
  setBoard: React.Dispatch<React.SetStateAction<Board | null>>,
  showMessage: (msg: string) => void,
  user: any,
) {
  const boardRef = useRef(board);
  boardRef.current = board;
  const projectRef = useRef(project);
  projectRef.current = project;
  const userRef = useRef(user);
  userRef.current = user;

  const addComment = useCallback(
    async (taskId: string, content: string): Promise<void> => {
      const currentProject = projectRef.current;
      const currentUser = userRef.current;
      if (!currentProject) return;
      if (
        currentProject.userRole === 'PROJECT_VIEWER' &&
        currentUser?.globalRole !== 'GLOBAL_ADMIN'
      ) {
        alert('You do not have permission to add comments.');
        return;
      }

      const createdComment = await apiClient('/comments', {
        method: 'POST',
        body: JSON.stringify({ taskId, content }),
      });

      const authorMember = currentProject.members.find(
        (member) => member.id === createdComment.authorId,
      );
      const authorName = authorMember?.name ?? currentUser?.name ?? 'Unknown User';
      const authorAvatarUrl =
        authorMember?.avatarUrl ??
        (createdComment.authorId === currentUser?.id ? currentUser?.avatarUrl : null) ??
        null;

      setBoard((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      comments: [
                        ...(task.comments ?? []),
                        { ...createdComment, authorName, authorAvatarUrl },
                      ],
                    }
                  : task,
              ),
            }
          : prev,
      );
    },
    [setBoard],
  );

  const editComment = useCallback(
    async (commentId: string, content: string): Promise<void> => {
      const currentBoard = boardRef.current;
      const currentUser = userRef.current;
      if (!currentBoard || !currentUser) return;
      const commentEditWindowMs = 2 * 24 * 60 * 60 * 1000 * 3;

      const commentToEdit = currentBoard.tasks
        .flatMap((task) => task.comments ?? [])
        .find((comment) => comment.id === commentId);

      if (!commentToEdit) {
        alert('Comment not found.');
        return;
      }

      const isAuthor = commentToEdit.authorId === currentUser.id;
      const isGlobalAdmin = currentUser.globalRole === 'GLOBAL_ADMIN';

      if (!isGlobalAdmin && !isAuthor) {
        alert('You can only edit your own comments.');
        return;
      }

      if (!isGlobalAdmin) {
        const createdAtMs = new Date(commentToEdit.createdAt).getTime();
        const isWithinEditWindow =
          Number.isFinite(createdAtMs) &&
          Date.now() - createdAtMs <= commentEditWindowMs;

        if (!isWithinEditWindow) {
          alert('You can only edit a comment within 6 days of posting it.');
          return;
        }
      }

      try {
        const updatedComment = await apiClient(`/comments/${commentId}`, {
          method: 'PUT',
          body: JSON.stringify({ content }),
        });

        setBoard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map((task) => ({
              ...task,
              comments: task.comments?.map((comment) =>
                comment.id === commentId
                  ? {
                      ...comment,
                      content: updatedComment.content ?? content,
                      updatedAt:
                        updatedComment.updatedAt ?? new Date().toISOString(),
                    }
                  : comment,
              ),
            })),
          };
        });
      } catch {
        showMessage('Failed to edit comment.');
      }
    },
    [setBoard, showMessage],
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<void> => {
      const currentBoard = boardRef.current;
      const currentUser = userRef.current;
      if (!currentBoard || !currentUser) return;
      const commentDeleteWindowMs = 2 * 24 * 60 * 60 * 1000;

      const commentToDelete = currentBoard.tasks
        .flatMap((task) => task.comments ?? [])
        .find((comment) => comment.id === commentId);

      if (!commentToDelete) {
        alert('Comment not found.');
        return;
      }

      const isAuthor = commentToDelete.authorId === currentUser.id;
      const isGlobalAdmin = currentUser.globalRole === 'GLOBAL_ADMIN';

      if (!isGlobalAdmin && !isAuthor) {
        alert('You can only delete your own comments.');
        return;
      }

      if (!isGlobalAdmin) {
        const createdAtMs = new Date(commentToDelete.createdAt).getTime();
        const isWithinDeleteWindow =
          Number.isFinite(createdAtMs) &&
          Date.now() - createdAtMs <= commentDeleteWindowMs;

        if (!isWithinDeleteWindow) {
          alert('You can only delete a comment within 2 days of posting it.');
          return;
        }
      }

      try {
        await apiClient(`/comments/${commentId}`, { method: 'DELETE' });
        setBoard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map((task) => ({
              ...task,
              comments: task.comments?.filter((c) => c.id !== commentId),
            })),
          };
        });
      } catch {
        showMessage('Failed to delete comment.');
      }
    },
    [setBoard, showMessage],
  );

  return { addComment, editComment, deleteComment };
}
