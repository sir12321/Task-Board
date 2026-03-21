import type { Board, NewTaskInput, ProjectDetails } from '../types/Types';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import BoardView from '../components/Board/Board/Board';
import { apiClient } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function BoardPage() {
  const { projectId, boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [board, setBoard] = useState<Board | null>(null);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Fetch projects list, then resolve which board to show
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

        // Resolve project
        let resolvedProject = projectId
          ? projects.find((p) => p.id === projectId)
          : projects[0];
        if (!resolvedProject) resolvedProject = projects[0];

        // Resolve board id
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

        // If we resolved to a different URL, redirect
        if (resolvedProject.id !== projectId || resolvedBoardId !== boardId) {
          navigate(
            `/projects/${resolvedProject.id}/boards/${resolvedBoardId}`,
            { replace: true },
          );
          return;
        }

        // Fetch the board data
        const boardData: Board = await apiClient(`/boards/${resolvedBoardId}`);
        if (!cancelled) {
          setProject(resolvedProject);
          setBoard(hydrateBoardAvatars(boardData, resolvedProject));
        }
      } catch (err) {
        console.error('Failed to load board:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [projectId, boardId, navigate, hydrateBoardAvatars]);

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
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              tasks: [
                {
                  ...created,
                  columnName: column?.name ?? 'Unknown',
                  reporterAvatarUrl:
                    created.reporterAvatarUrl ?? user.avatarUrl ?? null,
                  assigneeName: created.assigneeName ?? assigneeMember?.name,
                  assigneeAvatarUrl:
                    created.assigneeAvatarUrl ?? assigneeMember?.avatarUrl,
                  comments: [],
                },
                ...prev.tasks,
              ],
            }
          : prev,
      );
    },
    [board, project, user],
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

      try {
        const existingTask = board.tasks.find((t) => t.id === taskId);
        const statusChanged =
          Boolean(existingTask) && existingTask.columnId !== payload.columnId;

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

          setBoard((prev) =>
            prev
              ? {
                  ...prev,
                  tasks: prev.tasks.map((task) =>
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
                              ? (movedTask.updatedAt as string | undefined) ??
                                task.updatedAt
                              : task.updatedAt,
                        }
                      : task,
                  ),
                }
              : prev,
          );

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
          board.tasks.find((task) => task.id === payload.parentId)?.title ??
          null;
        setBoard((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((task) =>
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
                          column?.name ??
                          updatedTask.columnName ??
                          task.columnName,
                        updatedAt:
                          updatedTask.updatedAt ?? new Date().toISOString(),
                      }
                    : task,
                ),
              }
            : prev,
        );
      } catch (err) {
        console.error('Failed to update task:', err);
        throw err;
      }
    },
    [board, project, user],
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
        body: JSON.stringify({
          taskId,
          content,
        }),
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
                        {
                          ...createdComment,
                          authorName,
                          authorAvatarUrl,
                        },
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
      } catch (error) {
        console.error('Failed to edit comment:', error);
        alert('Failed to edit comment.');
      }
    },
    [board, user],
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
      } catch (error) {
        console.error('Failed to delete comment:', error);
        alert('Failed to delete comment.');
      }
    },
    [board, user],
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

        setBoard((prev) =>
          prev
            ? {
                ...prev,
                columns: [...prev.columns, newColumn],
              }
            : prev,
        );
      } catch (error) {
        console.error('Failed to create column:', error);
        alert('Failed to create column. Check console for details.');
      }
    },
    [project, board],
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

        setBoard((prev) =>
          prev
            ? {
                ...prev,
                columns: prev.columns.map((c) =>
                  c.id === columnId ? { ...c, name: newName } : c,
                ),
                tasks: prev.tasks.map((t) =>
                  t.columnId === columnId ? { ...t, columnName: newName } : t,
                ),
              }
            : prev,
        );
      } catch (error) {
        console.error('Failed to rename column:', error);
        alert('Failed to rename column.');
      }
    },
    [project, board, user],
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
      } catch (error) {
        console.error('Failed to reorder column:', error);
        alert('Failed to reorder column.');
      }
    },
    [project, board, user],
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
      } catch (error) {
        console.error('Failed to update WIP limit:', error);
        alert('Failed to update WIP limit.');
      }
    },
    [project, board, user],
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
      if (column?.order === 0) {
        alert('Stories column cannot be deleted.');
        return;
      }

      if (!confirm('Are you sure you want to delete this column?')) return;

      try {
        await apiClient(`/columns/${columnId}`, { method: 'DELETE' });

        setBoard((prev) =>
          prev
            ? {
                ...prev,
                columns: prev.columns.filter((c) => c.id !== columnId),
              }
            : prev,
        );
      } catch (error) {
        console.error('Failed to delete column:', error);
        alert(
          'Cannot delete a column that contains tasks. Move or delete them first.',
        );
      }
    },
    [project, board, user],
  );

  if (loading && !board) {
    return (
      <Layout>
        <div style={{ padding: '20px' }}>Loading board...</div>
      </Layout>
    );
  }

  if (!board || !project) {
    return (
      <Layout>
        <div style={{ padding: '20px' }}>No project/board data found.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        style={{
          opacity: loading ? 0.75 : 1,
          transition: 'opacity 180ms ease',
        }}
      >
        {loading && board && (
          <div
            style={{
              padding: '8px 20px 0',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            Updating board...
          </div>
        )}
        <BoardView
          key={`${project.id}:${board.id}`}
          board={board}
          projectDetails={project}
          onDeleteTask={deleteTask}
          onCreateTask={createTask}
          onUpdateTask={updateTask}
          onAddComment={addComment}
          onEditComment={editComment}
          onDeleteComment={deleteComment}
          onAddColumn={addColumn}
          onRenameColumn={renameColumn}
          onReorderColumn={reorderColumn}
          onUpdateColumnWip={updateColumnWip}
          onDeleteColumn={deleteColumn}
        />
      </div>
    </Layout>
  );
}
