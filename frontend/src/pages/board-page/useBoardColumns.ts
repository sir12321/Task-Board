import { useCallback, useRef } from 'react';
import type {
  AuthUser,
  Board,
  BoardWorkflow,
  ProjectDetails,
} from '../../types/Types';
import { apiClient } from '../../utils/api';

export function useBoardColumns(
  board: Board | null,
  project: ProjectDetails | null,
  updateBoardState: (updater: (currentBoard: Board) => Board) => void,
  setBoard: React.Dispatch<React.SetStateAction<Board | null>>,
  showMessage: (msg: string) => void,
  user: AuthUser | null,
) {
  const boardRef = useRef(board);
  boardRef.current = board;
  const projectRef = useRef(project);
  projectRef.current = project;
  const userRef = useRef(user);
  userRef.current = user;

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

  const addColumn = useCallback(
    async (columnName: string): Promise<void> => {
      const currentProject = projectRef.current;
      const currentBoard = boardRef.current;
      if (!currentProject || !currentBoard) return;
      try {
        const newColumn = await apiClient('/columns', {
          method: 'POST',
          body: JSON.stringify({
            name: columnName,
            boardId: currentBoard.id,
            wipLimit: null,
          }),
        });

        updateBoardState((board) => ({
          ...board,
          workflowColumnIds: insertColumnIntoWorkflow(board, newColumn.id),
          columns: [...board.columns, newColumn],
        }));
      } catch {
        showMessage('Failed to create column.');
      }
    },
    [insertColumnIntoWorkflow, showMessage, updateBoardState],
  );

  const renameColumn = useCallback(
    async (columnId: string, newName: string): Promise<void> => {
      const currentProject = projectRef.current;
      const currentBoard = boardRef.current;
      const currentUser = userRef.current;
      if (!currentProject || !currentBoard) return;
      if (
        currentProject.userRole !== 'PROJECT_ADMIN' &&
        currentUser?.globalRole !== 'GLOBAL_ADMIN'
      ) {
        alert('Only Project Admins or Global Admins can rename columns.');
        return;
      }

      try {
        await apiClient(`/columns/${columnId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: newName }),
        });

        updateBoardState((board) => ({
          ...board,
          columns: board.columns.map((c) =>
            c.id === columnId ? { ...c, name: newName } : c,
          ),
          tasks: board.tasks.map((task) =>
            task.columnId === columnId
              ? { ...task, columnName: newName }
              : task,
          ),
        }));
      } catch {
        showMessage('Failed to rename column.');
      }
    },
    [showMessage, updateBoardState],
  );

  const reorderColumn = useCallback(
    async (columnId: string, direction: 'left' | 'right'): Promise<void> => {
      const currentProject = projectRef.current;
      const currentBoard = boardRef.current;
      const currentUser = userRef.current;
      if (!currentProject || !currentBoard) return;
      if (
        currentProject.userRole !== 'PROJECT_ADMIN' &&
        currentUser?.globalRole !== 'GLOBAL_ADMIN'
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
    [setBoard, showMessage],
  );

  const updateColumnWip = useCallback(
    async (columnId: string, newWipLimit: number | null): Promise<void> => {
      const currentProject = projectRef.current;
      const currentBoard = boardRef.current;
      const currentUser = userRef.current;
      if (!currentProject || !currentBoard) return;
      if (
        currentProject.userRole !== 'PROJECT_ADMIN' &&
        currentUser?.globalRole !== 'GLOBAL_ADMIN'
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
    [setBoard, showMessage],
  );

  const deleteColumn = useCallback(
    async (columnId: string): Promise<void> => {
      const currentProject = projectRef.current;
      const currentBoard = boardRef.current;
      const currentUser = userRef.current;
      if (!currentProject || !currentBoard) return;
      if (
        currentProject.userRole !== 'PROJECT_ADMIN' &&
        currentUser?.globalRole !== 'GLOBAL_ADMIN'
      ) {
        alert('Only Project Admins or Global Admins can delete columns.');
        return;
      }

      const column = currentBoard.columns.find(
        (currentColumn) => currentColumn.id === columnId,
      );
      if (currentBoard.storyColumnId === column?.id) {
        alert('Stories column cannot be deleted.');
        return;
      }

      try {
        await apiClient(`/columns/${columnId}`, { method: 'DELETE' });

        updateBoardState((board) => ({
          ...board,
          ...removeColumnFromWorkflow(board, columnId),
          columns: board.columns.filter((c) => c.id !== columnId),
        }));
      } catch {
        showMessage(
          'Cannot delete a column that contains tasks. Move or delete them first.',
        );
      }
    },
    [removeColumnFromWorkflow, showMessage, updateBoardState],
  );

  const updateWorkflow = useCallback(
    async (workflow: BoardWorkflow): Promise<void> => {
      const currentProject = projectRef.current;
      const currentBoard = boardRef.current;
      if (!currentProject || !currentBoard) return;

      try {
        await apiClient(`/boards/${currentBoard.id}/workflow`, {
          method: 'PUT',
          body: JSON.stringify(workflow),
        });

        updateBoardState((board) => ({
          ...board,
          ...workflow,
        }));
      } catch {
        showMessage('Failed to update workflow.');
      }
    },
    [showMessage, updateBoardState],
  );

  return {
    addColumn,
    renameColumn,
    reorderColumn,
    updateColumnWip,
    deleteColumn,
    updateWorkflow,
  };
}
