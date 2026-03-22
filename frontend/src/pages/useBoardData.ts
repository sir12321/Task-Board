import { useState, useEffect, useCallback } from 'react';
import type {
  Board,
  BoardWorkflow,
  NewTaskInput,
  ProjectDetails,
  Task,
} from '../types/Types';
import { apiClient } from '../utils/api';
import {
  getTaskStatus,
  isClosedColumn,
  isResolvedColumn,
} from '../components/Board/Board/workflow';

export function useBoardData(
  projectId: string | undefined,
  boardId: string | undefined,
  user: any,
  navigate: any,
  showMessage: (msg: string) => void,
) {
  const [board, setBoard] = useState<Board | null>(null);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const withRecomputedStatuses = useCallback((nextBoard: Board): Board => {
    return {
      ...nextBoard,
      tasks: nextBoard.tasks.map((task) => ({
        ...task,
        status: getTaskStatus(nextBoard, task),
      })),
    };
  }, []);

  const updateBoardState = useCallback(
    (updater: (currentBoard: Board) => Board) => {
      setBoard((currentBoard) => {
        if (!currentBoard) return currentBoard;
        return withRecomputedStatuses(updater(currentBoard));
      });
    },
    [withRecomputedStatuses],
  );

  const insertColumnIntoWorkflow = useCallback(
    (currentBoard: Board, columnId: string): string[] => {
      const nextWorkflowColumnIds = [...currentBoard.workflowColumnIds];
      const closedIndex = currentBoard.closedColumnId
        ? nextWorkflowColumnIds.findIndex(
            (workflowColumnId) =>
              workflowColumnId === currentBoard.closedColumnId,
          )
        : -1;

      if (closedIndex >= 0) {
        nextWorkflowColumnIds.splice(closedIndex, 0, columnId);
        return nextWorkflowColumnIds;
      }

      nextWorkflowColumnIds.push(columnId);
      return nextWorkflowColumnIds;
    },
    [],
  );

  const removeColumnFromWorkflow = useCallback(
    (currentBoard: Board, columnId: string): BoardWorkflow => ({
      storyColumnId:
        currentBoard.storyColumnId === columnId
          ? null
          : currentBoard.storyColumnId,
      workflowColumnIds: currentBoard.workflowColumnIds.filter(
        (workflowColumnId) => workflowColumnId !== columnId,
      ),
      resolvedColumnId:
        currentBoard.resolvedColumnId === columnId
          ? null
          : currentBoard.resolvedColumnId,
      closedColumnId:
        currentBoard.closedColumnId === columnId
          ? null
          : currentBoard.closedColumnId,
    }),
    [],
  );

  const hydrateBoardAvatars = useCallback(
    (rawBoard: Board, projectDetails: ProjectDetails): Board => {
      const memberById = new Map(
        projectDetails.members.map((member) => [member.id, member]),
      );

      return {
        ...rawBoard,
        tasks: rawBoard.tasks.map((task) => {
          const assigneeMember = task.assigneeId
            ? memberById.get(task.assigneeId)
            : undefined;
          const reporterMember = memberById.get(task.reporterId);

          return {
            ...task,
            assigneeAvatarUrl:
              task.assigneeAvatarUrl ?? assigneeMember?.avatarUrl ?? null,
            reporterAvatarUrl:
              task.reporterAvatarUrl ??
              reporterMember?.avatarUrl ??
              (task.reporterId === user?.id ? user.avatarUrl : null) ??
              null,
            comments: task.comments?.map((comment) => {
              const authorMember = memberById.get(comment.authorId);

              return {
                ...comment,
                authorAvatarUrl:
                  comment.authorAvatarUrl ??
                  authorMember?.avatarUrl ??
                  (comment.authorId === user?.id ? user.avatarUrl : null) ??
                  null,
              };
            }),
          };
        }),
      };
    },
    [user?.avatarUrl, user?.id],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const projects: ProjectDetails[] = await apiClient('/projects');
        if (cancelled || projects.length === 0) {
          setLoading(false);
          return;
        }

        let resolvedProject = projectId
          ? projects.find((p) => p.id === projectId)
          : projects[0];
        if (!resolvedProject) resolvedProject = projects[0];

        let resolvedBoardId = boardId;
        if (
          !resolvedBoardId ||
          !resolvedProject.boards.find((b) => b.id === resolvedBoardId)
        ) {
          resolvedBoardId = resolvedProject.boards[0]?.id;
        }

        if (!resolvedBoardId) {
          setProject(resolvedProject);
          setBoard(null);
          setLoading(false);
          return;
        }

        if (resolvedProject.id !== projectId || resolvedBoardId !== boardId) {
          navigate(
            `/projects/${resolvedProject.id}/boards/${resolvedBoardId}`,
            { replace: true },
          );
          return;
        }

        const boardData: Board = await apiClient(`/boards/${resolvedBoardId}`);
        if (!cancelled) {
          setProject(resolvedProject);
          setBoard(hydrateBoardAvatars(boardData, resolvedProject));
        }
      } catch {
        showMessage('Failed to load board.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [projectId, boardId, navigate, hydrateBoardAvatars, showMessage]);

  const deleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      if (!project || !board) return;
      if (
        project.userRole === 'PROJECT_VIEWER' &&
        user?.globalRole !== 'GLOBAL_ADMIN'
      ) {
        alert('You do not have permission to delete tasks.');
        return;
      }

      const hasChildren = board.tasks.some((t) => t.parentId === taskId);
      if (hasChildren) {
        alert('Cannot delete a Story with child tasks.');
        return;
      }

      await apiClient(`/tasks/${taskId}`, { method: 'DELETE' });
      setBoard((prev) =>
        prev
          ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) }
          : prev,
      );
    },
    [board, project, user],
  );

  const createTask = useCallback(
    async (payload: NewTaskInput): Promise<void> => {
      if (!project || !board || !user) return;
      if (
        project.userRole === 'PROJECT_VIEWER' &&
        user.globalRole !== 'GLOBAL_ADMIN'
      ) {
        alert('You do not have permission to create tasks.');
        return;
      }

      const created = await apiClient('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          boardId: board.id,
          reporterId: user.id,
        }),
      });

      const column = board.columns.find((c) => c.id === payload.columnId);
      const assigneeMember = project.members.find(
        (member) => member.id === payload.assigneeId,
      );

      updateBoardState((currentBoard) => ({
        ...currentBoard,
        tasks: [
          {
            ...created,
            columnName: column?.name ?? 'Unknown',
            reporterName: created.reporterName ?? user.name,
            reporterAvatarUrl:
              created.reporterAvatarUrl ?? user.avatarUrl ?? null,
            assigneeName: created.assigneeName ?? assigneeMember?.name,
            assigneeAvatarUrl:
              created.assigneeAvatarUrl ?? assigneeMember?.avatarUrl,
            comments: [],
            resolvedAt: isResolvedColumn(currentBoard, payload.columnId)
              ? (created.resolvedAt ?? new Date().toISOString())
              : null,
            closedAt: isClosedColumn(currentBoard, payload.columnId)
              ? (created.closedAt ?? new Date().toISOString())
              : null,
          },
          ...currentBoard.tasks,
        ],
      }));
    },
    [board, project, updateBoardState, user],
  );

  const updateTask = useCallback(
    async (taskId: string, payload: NewTaskInput): Promise<void> => {
      if (!project || !board) return;
      if (
        project.userRole === 'PROJECT_VIEWER' &&
        user?.globalRole !== 'GLOBAL_ADMIN'
      ) {
        alert('You do not have permission to edit tasks.');
        return;
      }

      const existingTask = board.tasks.find((t) => t.id === taskId);
      const statusChanged =
        !!existingTask && existingTask.columnId !== payload.columnId;

      const hasTaskFieldChanges =
        !existingTask ||
        existingTask.title !== payload.title ||
        (existingTask.description ?? null) !== (payload.description ?? null) ||
        existingTask.type !== payload.type ||
        existingTask.priority !== payload.priority ||
        (existingTask.dueDate ?? null) !== (payload.dueDate ?? null) ||
        (existingTask.assigneeId ?? null) !== (payload.assigneeId ?? null) ||
        (existingTask.parentId ?? null) !== (payload.parentId ?? null);

      let movedTask: Partial<Task> | null = null;

      if (statusChanged) {
        movedTask = await apiClient(`/tasks/${taskId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ targetColumnId: payload.columnId }),
        });
      }

      if (statusChanged && !hasTaskFieldChanges) {
        const column = board.columns.find((c) => c.id === payload.columnId);
        updateBoardState((currentBoard) => ({
          ...currentBoard,
          tasks: currentBoard.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  columnId: payload.columnId,
                  columnName: column?.name ?? task.columnName,
                  resolvedAt:
                    movedTask && 'resolvedAt' in movedTask
                      ? (movedTask.resolvedAt as string | null | undefined)
                      : task.resolvedAt,
                  closedAt:
                    movedTask && 'closedAt' in movedTask
                      ? (movedTask.closedAt as string | null | undefined)
                      : task.closedAt,
                  updatedAt:
                    movedTask && 'updatedAt' in movedTask
                      ? ((movedTask.updatedAt as string | undefined) ??
                        task.updatedAt)
                      : task.updatedAt,
                }
              : task,
          ),
        }));
        return;
      }

      const updatedTask = await apiClient(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          type: payload.type,
          priority: payload.priority,
          dueDate: payload.dueDate,
          assigneeId: payload.assigneeId,
          parentId: payload.parentId,
        }),
      });

      const column = board.columns.find((c) => c.id === payload.columnId);
      const assigneeMember = project.members.find(
        (member) => member.id === payload.assigneeId,
      );
      const assigneeName = assigneeMember?.name ?? null;
      const parentName =
        board.tasks.find((task) => task.id === payload.parentId)?.title ?? null;

      updateBoardState((currentBoard) => ({
        ...currentBoard,
        tasks: currentBoard.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                ...updatedTask,
                title: payload.title,
                description: payload.description ?? null,
                type: payload.type,
                priority: payload.priority,
                dueDate: payload.dueDate,
                assigneeId: payload.assigneeId ?? null,
                assigneeName: updatedTask.assigneeName ?? assigneeName,
                assigneeAvatarUrl:
                  updatedTask.assigneeAvatarUrl ??
                  assigneeMember?.avatarUrl ??
                  null,
                parentId: payload.parentId ?? null,
                parentName: updatedTask.parentName ?? parentName,
                columnName:
                  column?.name ?? updatedTask.columnName ?? task.columnName,
                updatedAt: updatedTask.updatedAt ?? new Date().toISOString(),
              }
            : task,
        ),
      }));
    },
    [board, project, updateBoardState, user],
  );

  const addComment = useCallback(
    async (taskId: string, content: string): Promise<void> => {
      if (!project) return;
      if (
        project.userRole === 'PROJECT_VIEWER' &&
        user?.globalRole !== 'GLOBAL_ADMIN'
      ) {
        alert('You do not have permission to add comments.');
        return;
      }

      const createdComment = await apiClient('/comments', {
        method: 'POST',
        body: JSON.stringify({ taskId, content }),
      });

      const authorMember = project.members.find(
        (member) => member.id === createdComment.authorId,
      );
      const authorName = authorMember?.name ?? user?.name ?? 'Unknown User';
      const authorAvatarUrl =
        authorMember?.avatarUrl ??
        (createdComment.authorId === user?.id ? user?.avatarUrl : null) ??
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
    [project, user],
  );

  const editComment = useCallback(
    async (commentId: string, content: string): Promise<void> => {
      if (!board || !user) return;
      const commentEditWindowMs = 2 * 24 * 60 * 60 * 1000 * 3;

      const commentToEdit = board.tasks
        .flatMap((task) => task.comments ?? [])
        .find((comment) => comment.id === commentId);

      if (!commentToEdit) {
        alert('Comment not found.');
        return;
      }

      const isAuthor = commentToEdit.authorId === user.id;
      const isGlobalAdmin = user.globalRole === 'GLOBAL_ADMIN';

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
    [board, showMessage, user],
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<void> => {
      if (!board || !user) return;
      const commentDeleteWindowMs = 2 * 24 * 60 * 60 * 1000;

      const commentToDelete = board.tasks
        .flatMap((task) => task.comments ?? [])
        .find((comment) => comment.id === commentId);

      if (!commentToDelete) {
        alert('Comment not found.');
        return;
      }

      const isAuthor = commentToDelete.authorId === user.id;
      const isGlobalAdmin = user.globalRole === 'GLOBAL_ADMIN';

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
    [board, showMessage, user],
  );

  const addColumn = useCallback(
    async (columnName: string): Promise<void> => {
      if (!project || !board) return;
      try {
        const newColumn = await apiClient('/columns', {
          method: 'POST',
          body: JSON.stringify({
            name: columnName,
            boardId: board.id,
            wipLimit: null,
          }),
        });

        updateBoardState((currentBoard) => ({
          ...currentBoard,
          workflowColumnIds: insertColumnIntoWorkflow(
            currentBoard,
            newColumn.id,
          ),
          columns: [...currentBoard.columns, newColumn],
        }));
      } catch {
        showMessage('Failed to create column.');
      }
    },
    [project, board, insertColumnIntoWorkflow, showMessage, updateBoardState],
  );

  const renameColumn = useCallback(
    async (columnId: string, newName: string): Promise<void> => {
      if (!project || !board) return;
      if (
        project.userRole !== 'PROJECT_ADMIN' &&
        user?.globalRole !== 'GLOBAL_ADMIN'
      ) {
        alert('Only Project Admins or Global Admins can rename columns.');
        return;
      }

      try {
        await apiClient(`/columns/${columnId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: newName }),
        });

        updateBoardState((currentBoard) => ({
          ...currentBoard,
          columns: currentBoard.columns.map((c) =>
            c.id === columnId ? { ...c, name: newName } : c,
          ),
          tasks: currentBoard.tasks.map((task) =>
            task.columnId === columnId
              ? { ...task, columnName: newName }
              : task,
          ),
        }));
      } catch {
        showMessage('Failed to rename column.');
      }
    },
    [project, board, showMessage, updateBoardState, user],
  );

  const reorderColumn = useCallback(
    async (columnId: string, direction: 'left' | 'right'): Promise<void> => {
      if (!project || !board) return;
      if (
        project.userRole !== 'PROJECT_ADMIN' &&
        user?.globalRole !== 'GLOBAL_ADMIN'
      ) {
        alert('Only ProjectAdmin can reorder columns.');
        return;
      }

      try {
        await apiClient(`/columns/${columnId}/reorder`, {
          method: 'PUT',
          body: JSON.stringify({ direction }),
        });

        setBoard((prev) => {
          if (!prev) return prev;
          const sorted = [...prev.columns].sort((a, b) => a.order - b.order);
          const currentIndex = sorted.findIndex((c) => c.id === columnId);
          const targetIndex =
            direction === 'left' ? currentIndex - 1 : currentIndex + 1;
          if (targetIndex < 0 || targetIndex >= sorted.length) return prev;

          const currentOrder = sorted[currentIndex].order;
          const targetOrder = sorted[targetIndex].order;

          return {
            ...prev,
            columns: prev.columns.map((c) => {
              if (c.id === sorted[currentIndex].id)
                return { ...c, order: targetOrder };
              if (c.id === sorted[targetIndex].id)
                return { ...c, order: currentOrder };
              return c;
            }),
          };
        });
      } catch {
        showMessage('Failed to reorder column.');
      }
    },
    [project, board, showMessage, user],
  );

  const updateColumnWip = useCallback(
    async (columnId: string, newWipLimit: number | null): Promise<void> => {
      if (!project || !board) return;
      if (
        project.userRole !== 'PROJECT_ADMIN' &&
        user?.globalRole !== 'GLOBAL_ADMIN'
      ) {
        alert('Only Project Admins or Global Admins can edit WIP limits.');
        return;
      }

      try {
        await apiClient(`/columns/${columnId}`, {
          method: 'PUT',
          body: JSON.stringify({ wipLimit: newWipLimit }),
        });

        setBoard((prev) =>
          prev
            ? {
                ...prev,
                columns: prev.columns.map((c) =>
                  c.id === columnId ? { ...c, wipLimit: newWipLimit } : c,
                ),
              }
            : prev,
        );
      } catch {
        showMessage('Failed to update WIP limit.');
      }
    },
    [project, board, showMessage, user],
  );

  const deleteColumn = useCallback(
    async (columnId: string): Promise<void> => {
      if (!project || !board) return;
      if (
        project.userRole !== 'PROJECT_ADMIN' &&
        user?.globalRole !== 'GLOBAL_ADMIN'
      ) {
        alert('Only Project Admins or Global Admins can delete columns.');
        return;
      }

      const column = board.columns.find(
        (currentColumn) => currentColumn.id === columnId,
      );
      if (board.storyColumnId === column?.id) {
        alert('Stories column cannot be deleted.');
        return;
      }

      try {
        await apiClient(`/columns/${columnId}`, { method: 'DELETE' });

        updateBoardState((currentBoard) => ({
          ...currentBoard,
          ...removeColumnFromWorkflow(currentBoard, columnId),
          columns: currentBoard.columns.filter((c) => c.id !== columnId),
        }));
      } catch {
        showMessage(
          'Cannot delete a column that contains tasks. Move or delete them first.',
        );
      }
    },
    [
      project,
      board,
      removeColumnFromWorkflow,
      showMessage,
      updateBoardState,
      user,
    ],
  );

  const updateWorkflow = useCallback(
    async (workflow: BoardWorkflow): Promise<void> => {
      if (!project || !board) return;

      try {
        await apiClient(`/boards/${board.id}/workflow`, {
          method: 'PUT',
          body: JSON.stringify(workflow),
        });

        updateBoardState((currentBoard) => ({
          ...currentBoard,
          ...workflow,
        }));
      } catch {
        showMessage('Failed to update workflow.');
      }
    },
    [project, board, showMessage, updateBoardState],
  );

  return {
    board,
    project,
    loading,
    deleteTask,
    createTask,
    updateTask,
    addComment,
    editComment,
    deleteComment,
    addColumn,
    renameColumn,
    reorderColumn,
    updateColumnWip,
    deleteColumn,
    updateWorkflow,
  };
}
