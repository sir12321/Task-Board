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
        if (!resolvedBoardId || !resolvedProject.boards.find((b) => b.id === resolvedBoardId)) {
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
          navigate(`/projects/${resolvedProject.id}/boards/${resolvedBoardId}`, { replace: true });
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
    return () => { cancelled = true; };
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
        prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) } : prev,
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

      // Move task to a different column if columnId changed
      const existingTask = board.tasks.find((t) => t.id === taskId);
      if (existingTask && existingTask.columnId !== payload.columnId) {
        await apiClient(`/tasks/${taskId}/move`, {
          method: 'PUT',
          body: JSON.stringify({ targetColumnId: payload.columnId }),
        });
      }

      const column = board.columns.find((c) => c.id === payload.columnId);
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      title: payload.title,
                      description: payload.description ?? null,
                      type: payload.type,
                      priority: payload.priority,
                      dueDate: payload.dueDate,
                      columnId: payload.columnId,
                      columnName: column?.name ?? task.columnName,
                      assigneeId: payload.assigneeId ?? null,
                      parentId: payload.parentId ?? null,
                      updatedAt: new Date().toISOString(),
                    }
                  : task,
              ),
            }
          : prev,
      );
    },
    [board, project],
  );

  const addColumn = useCallback(
    async (): Promise<void> => {
      if (!project) return;
      if (project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can create columns.');
        return;
      }
      alert('Column creation via API is not yet supported.');
    },
    [project],
  );

  const renameColumn = useCallback(
    async (): Promise<void> => {
      if (!project) return;
      if (project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can rename columns.');
        return;
      }
      alert('Column rename via API is not yet supported.');
    },
    [project],
  );

  const reorderColumn = useCallback(
    async (): Promise<void> => {
      if (!project) return;
      if (project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can reorder columns.');
        return;
      }
      alert('Column reorder via API is not yet supported.');
    },
    [project],
  );

  const updateColumnWip = useCallback(
    async (): Promise<void> => {
      if (!project) return;
      if (project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can edit WIP limits.');
        return;
      }
      alert('Column WIP update via API is not yet supported.');
    },
    [project],
  );

  const deleteColumn = useCallback(
    async (): Promise<void> => {
      if (!project) return;
      if (project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can delete columns.');
        return;
      }
      alert('Column delete via API is not yet supported.');
    },
    [project],
  );

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '20px' }}>Loading...</div>
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
      <BoardView
        key={`${project.id}:${board.id}`}
        board={board}
        projectDetails={project}
        onDeleteTask={deleteTask}
        onCreateTask={createTask}
        onUpdateTask={updateTask}
        onAddColumn={addColumn}
        onRenameColumn={renameColumn}
        onReorderColumn={reorderColumn}
        onUpdateColumnWip={updateColumnWip}
        onDeleteColumn={deleteColumn}
      />
    </Layout>
  );
}
