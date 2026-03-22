import { useCallback } from 'react';
import type { Board, NewTaskInput, ProjectDetails, Task } from '../types/Types';
import { apiClient } from '../utils/api';
import {
  isClosedColumn,
  isResolvedColumn,
} from '../components/Board/Board/workflow';

export function useBoardTasks(
  board: Board | null,
  project: ProjectDetails | null,
  updateBoardState: (updater: (currentBoard: Board) => Board) => void,
  setBoard: React.Dispatch<React.SetStateAction<Board | null>>,
  user: any,
) {
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
    [board, project, setBoard, user],
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

  return { deleteTask, createTask, updateTask };
}
