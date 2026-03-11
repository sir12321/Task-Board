import type { Board as BoardType } from '../../../types/Types';

// Business logic for determining whether a task may move to a target column.
// The function mirrors the rules previously inline in Board.tsx. It does not
// modify state directly, but returns a boolean and uses the provided `setshortError`
// callback to communicate why a move was disallowed.
import type { Dispatch } from 'react';
import type { BoardState, BoardAction } from './BoardReducer';

export const canMoveTask = (
  board: BoardType,
  taskId: string,
  targetColumnId: string,
  setshortError: (message: string | null) => void,
): boolean => {
  const task = board.tasks.find((t) => t.id === taskId);
  if (!task) return false;

  const targetColumn = board.columns.find((c) => c.id === targetColumnId);
  if (!targetColumn) return false;

  const storyColID = board.columns.find((c) => c.order === 0)?.id || 'col-story';

  // Disallow non-story tasks from being moved into the dedicated story column
  if (targetColumn.id === storyColID && task.type !== 'STORY') {
    setshortError(
      'Move forbidden: only stories can go into the Stories column',
    );
    return false;
  }

  // Prevent STORY tasks from being moved out of the story column
  if (task.type === 'STORY' && targetColumn.id !== storyColID) {
    setshortError('Move forbidden: stories must remain in the Stories column');
    return false;
  }

  // WIP enforcement
  const tasksInColumn = board.tasks.filter(
    (t) => t.columnId === targetColumnId,
  );

  if (targetColumn.wipLimit && tasksInColumn.length >= targetColumn.wipLimit) {
    setshortError('Move forbidden: WIP limit reached');
    return false;
  }

  // Column-order enforcement: only allow moves to the adjacent next column
  // (i.e., move forward by exactly 1). Disallow backward moves or jumps.
  const sourceColumn = board.columns.find((c) => c.id === task.columnId);
  if (sourceColumn) {
    const orderDiff = targetColumn.order - sourceColumn.order;
    if (orderDiff !== 1) {
      setshortError('Move forbidden: only adjacent forward moves are allowed');
      return false;
    }
  }

  return true;
};

/**
 * Handler used by the board when a task is dropped into a column. This
 * encapsulates the validation logic and dispatch call that previously lived
 * inside `Board.tsx`.
 */
export const handleDrop = (
  state: BoardState,
  dispatch: Dispatch<BoardAction>,
  taskId: string,
  targetColumnId: string,
  setshortError: (message: string | null) => void,
) => {
  if (!canMoveTask(state.board, taskId, targetColumnId, setshortError)) return;

  dispatch({
    type: 'MOVE_TASK',
    payload: { taskId, targetColumnId },
  });
};
