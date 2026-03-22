import { useCallback, useRef } from 'react';
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
  const boardRef = useRef(board);
  boardRef.current = board;
  const projectRef = useRef(project);
  projectRef.current = project;
  const userRef = useRef(user);
  userRef.current = user;

  const deleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      const currentProject = projectRef.current;
      const currentBoard = boardRef.current;
      const currentUser = userRef.current;
      if (!currentProject || !currentBoard) return;
      if (
        currentProject.userRole === 'PROJECT_VIEWER' &&
        currentUser?.globalRole !== 'GLOBAL_ADMIN'
      ) {
        alert('You do not have permission to delete tasks.');
        return;
      }

      await apiClient(`/tasks/${taskId}`, { method: 'DELETE' });
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.filter(
                (t) => t.id !== taskId && t.parentId !== taskId,
              ),
            }
          : prev,
      );
    },
    [setBoard],
  );

  const createTask = useCallback(
    async (payload: NewTaskInput): Promise<void> => {
      const currentProject = projectRef.current;
      const currentBoard = boardRef.current;
      const currentUser = userRef.current;
      if (!currentProject || !currentBoard || !currentUser) return;
      if (
        currentProject.userRole === 'PROJECT_VIEWER' &&
        currentUser.globalRole !== 'GLOBAL_ADMIN'
      ) {
        alert('You do not have permission to create tasks.');
        return;
      }

      const created = await apiClient('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          boardId: currentBoard.id,
          reporterId: currentUser.id,
        }),
      });

      const column = currentBoard.columns.find((c) => c.id === payload.columnId);
      const assigneeMember = currentProject.members.find(
        (member) => member.id === payload.assigneeId,
      );

      updateBoardState((board) => ({
        ...board,
        tasks: [
          {
            ...created,
            columnName: column?.name ?? 'Unknown',
            reporterName: created.reporterName ?? currentUser.name,
            reporterAvatarUrl:
              created.reporterAvatarUrl ?? currentUser.avatarUrl ?? null,
            assigneeName: created.assigneeName ?? assigneeMember?.name,
            assigneeAvatarUrl:
              created.assigneeAvatarUrl ?? assigneeMember?.avatarUrl,
            comments: [],
            resolvedAt: isResolvedColumn(board, payload.columnId)
              ? (created.resolvedAt ?? new Date().toISOString())
              : null,
            closedAt: isClosedColumn(board, payload.columnId)
              ? (created.closedAt ?? new Date().toISOString())
              : null,
          },
          ...board.tasks,
        ],
      }));
    },
    [updateBoardState],
  );

  const updateTask = useCallback(
    async (taskId: string, payload: NewTaskInput): Promise<void> => {
      const currentProject = projectRef.current;
      const currentBoard = boardRef.current;
      const currentUser = userRef.current;
      if (!currentProject || !currentBoard) return;
      if (
        currentProject.userRole === 'PROJECT_VIEWER' &&
        currentUser?.globalRole !== 'GLOBAL_ADMIN'
      ) {
        alert('You do not have permission to edit tasks.');
        return;
      }

      const existingTask = currentBoard.tasks.find((t) => t.id === taskId);
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
        const column = currentBoard.columns.find((c) => c.id === payload.columnId);
        updateBoardState((board) => ({
          ...board,
          tasks: board.tasks.map((task) =>
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

      const column = currentBoard.columns.find((c) => c.id === payload.columnId);
      const assigneeMember = currentProject.members.find(
        (member) => member.id === payload.assigneeId,
      );
      const assigneeName = assigneeMember?.name ?? null;
      const parentName =
        currentBoard.tasks.find((task) => task.id === payload.parentId)?.title ?? null;

      updateBoardState((board) => ({
        ...board,
        tasks: board.tasks.map((task) =>
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
    [updateBoardState],
  );

  return { deleteTask, createTask, updateTask };
}
