import type { Dispatch } from 'react';
import type { BoardAction, BoardState } from './BoardReducer';
import type {
  Board as BoardType,
  BoardColumn,
  BoardWorkflow,
  Task,
} from '../../../types/Types';
import { getTaskStatus } from './workflow';

interface UseBoardActionsProps {
  onRenameColumn?: (columnId: string, newName: string) => Promise<void> | void;
  onUpdateColumnWip?: (
    columnId: string,
    wipLimit: number | null,
  ) => Promise<void> | void;
  onAddColumn?: (columnName: string) => Promise<void> | void;
  onReorderColumn?: (
    columnId: string,
    direction: 'left' | 'right',
  ) => Promise<void> | void;
  onDeleteColumn?: (columnId: string) => Promise<void> | void;
  onUpdateWorkflow?: (workflow: BoardWorkflow) => Promise<void> | void;
  setShortError: (err: string | null) => void;
  dispatch: Dispatch<BoardAction>;
  state: BoardState;
  sortedColumns: BoardColumn[];
  setPendingWorkflowColumnDelete: (id: string | null) => void;
  StoryColumnId: string;
}

export const useBoardActions = ({
  onRenameColumn,
  onUpdateColumnWip,
  onAddColumn,
  onReorderColumn,
  onDeleteColumn,
  onUpdateWorkflow,
  setShortError,
  dispatch,
  state,
  sortedColumns,
  setPendingWorkflowColumnDelete,
  StoryColumnId,
}: UseBoardActionsProps) => {
  const handleRenameColumn = async (columnId: string, newName: string) => {
    if (onRenameColumn) {
      try {
        await onRenameColumn(columnId, newName);
      } catch (err) {
        setShortError((err as Error)?.message ?? 'Failed to rename column');
      }
      return;
    }
    dispatch({ type: 'RENAME_COLUMN', payload: { columnId, name: newName } });
  };

  const handleSubmitWip = async (columnId: string, wipLimit: number | null) => {
    if (onUpdateColumnWip) {
      try {
        await onUpdateColumnWip(columnId, wipLimit);
      } catch (err) {
        setShortError((err as Error)?.message ?? 'Failed to update WIP limit');
      }
      return;
    }
    dispatch({ type: 'UPDATE_COLUMN_WIP', payload: { columnId, wipLimit } });
  };

  const dispatchBoardUpdate = (nextBoard: BoardType) => {
    dispatch({
      type: 'SET_BOARD',
      payload: {
        board: {
          ...nextBoard,
          tasks: nextBoard.tasks.map((task: Task) => ({
            ...task,
            status: getTaskStatus(nextBoard, task),
          })),
        },
      },
    });
  };

  const handleSubmitAddColumn = async (columnName: string) => {
    if (onAddColumn) {
      try {
        await onAddColumn(columnName);
      } catch (err) {
        setShortError((err as Error)?.message || 'Failed to add column');
      }
      return;
    }
    dispatch({ type: 'ADD_COLUMN', payload: { name: columnName } });
  };

  const handleMoveColumn = async (
    columnId: string,
    direction: 'left' | 'right',
  ) => {
    if (columnId === StoryColumnId) {
      setShortError('Stories column must stay first');
      return;
    }
    const currentIndex = sortedColumns.findIndex(
      (column) => column.id === columnId,
    );
    const targetIndex =
      direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedColumns.length) return;
    if (sortedColumns[targetIndex]?.id === StoryColumnId) {
      setShortError('Stories column must stay first');
      return;
    }
    if (onReorderColumn) {
      try {
        await onReorderColumn(columnId, direction);
      } catch (err) {
        setShortError((err as Error)?.message ?? 'Failed to move column');
      }
      return;
    }
    dispatch({ type: 'REORDER_COLUMN', payload: { columnId, direction } });
  };

  const handleSubmitDeleteColumn = async (columnId: string) => {
    if (onDeleteColumn) {
      try {
        await onDeleteColumn(columnId);
        setPendingWorkflowColumnDelete(columnId);
      } catch (err) {
        setShortError((err as Error)?.message ?? 'Failed to delete column');
      }
      return;
    }
    dispatch({ type: 'DELETE_COLUMN', payload: { columnId } });
    setPendingWorkflowColumnDelete(columnId);
  };

  const handleSubmitWorkflow = async (workflow: BoardWorkflow) => {
    if (onUpdateWorkflow) {
      await onUpdateWorkflow(workflow);
      return;
    }
    const nextBoard = { ...state.board, ...workflow };
    dispatchBoardUpdate(nextBoard);
  };

  return {
    handleRenameColumn,
    handleSubmitWip,
    dispatchBoardUpdate,
    handleSubmitAddColumn,
    handleMoveColumn,
    handleSubmitDeleteColumn,
    handleSubmitWorkflow,
  };
};
