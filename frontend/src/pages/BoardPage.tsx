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
          setBoard(boardData);
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
  }, [projectId, boardId, navigate]);

  const deleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      if (!project || !board) return;
      if (project.userRole === 'PROJECT_VIEWER') {
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
    [board, project],
  );

  const createTask = useCallback(
    async (payload: NewTaskInput): Promise<void> => {
      if (!project || !board || !user) return;
      if (project.userRole === 'PROJECT_VIEWER') {
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
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              tasks: [
                {
                  ...created,
                  columnName: column?.name ?? 'Unknown',
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
      if (project.userRole === 'PROJECT_VIEWER') {
        alert('You do not have permission to edit tasks.');
        return;
      }

      try {
        const existingTask = board.tasks.find((t) => t.id === taskId);
        if (existingTask && existingTask.columnId !== payload.columnId) {
          await apiClient(`/tasks/${taskId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ targetColumnId: payload.columnId }),
          });
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
        const assigneeName =
          project.members.find((member) => member.id === payload.assigneeId)
            ?.name ?? null;
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
        alert('Action failed. Transition may be invalid or WIP limit reached.');
      }
    },
    [board, project],
  );

  const addComment = useCallback(
    async (taskId: string, content: string): Promise<void> => {
      if (!project) return;
      if (project.userRole === 'PROJECT_VIEWER') {
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

      const authorName =
        project.members.find((member) => member.id === createdComment.authorId)
          ?.name ??
        user?.name ??
        'Unknown User';

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
        alert("You can only delete your own comments.");
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
      if (project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can rename columns.');
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
    [project, board],
  );

  const reorderColumn = useCallback(
    async (columnId: string, direction: 'left' | 'right'): Promise<void> => {
      if (!project || !board) return;
      if (project.userRole !== 'PROJECT_ADMIN' && user?.globalRole !== 'GLOBAL_ADMIN') {
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
          const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
          if (targetIndex < 0 || targetIndex >= sorted.length) return prev;

          const currentOrder = sorted[currentIndex].order;
          const targetOrder = sorted[targetIndex].order;

          return {
            ...prev,
            columns: prev.columns.map((c) => {
              if (c.id === sorted[currentIndex].id) return { ...c, order: targetOrder };
              if (c.id === sorted[targetIndex].id) return { ...c, order: currentOrder };
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
      if (project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can edit WIP limits.');
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
    [project, board],
  );

  const deleteColumn = useCallback(
    async (columnId: string): Promise<void> => {
      if (!project || !board) return;
      if (project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can delete columns.');
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
    [project, board],
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
