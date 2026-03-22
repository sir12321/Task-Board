import type { Board as BoardType } from '../../../types/Types';
import type { Dispatch } from 'react';
import type { BoardState, BoardAction } from './BoardReducer';
import { getStoryColumnId, getWorkflowStep } from './workflow';

export const canMoveTask = (
  board: BoardType,
  taskId: string,
  targetColumnId: string,
  storyColumnId: string,
  setshortError: (message: string | null) => void,
): boolean => {
  const task = board.tasks.find((t) => t.id === taskId);
  if (!task) return false;

  const targetColumn = board.columns.find((c) => c.id === targetColumnId);
  if (!targetColumn) return false;
  // The Stories column is a container for epics only; regular work items must stay in workflow columns.
  if (targetColumn.id === storyColumnId && task.type !== 'STORY') {
    setshortError(
      'Move forbidden: only stories can go into the Stories column',
    );
    return false;
  }
  // Stories never advance through workflow stages directly; their status is derived from child tasks.
  if (task.type === 'STORY' && targetColumn.id !== storyColumnId) {
    setshortError('Move forbidden: stories must remain in the Stories column');
    return false;
  }
  // Check workflow order before WIP so the user gets the most relevant error first.
  const sourceColumn = board.columns.find((c) => c.id === task.columnId);
  if (sourceColumn) {
    const currentStep = getWorkflowStep(board, sourceColumn.id);
    const targetStep = getWorkflowStep(board, targetColumn.id);

    if (currentStep < 0 || targetStep < 0 || targetStep - currentStep !== 1) {
      setshortError(
        'Move forbidden: only the next configured workflow stage is allowed',
      );
      return false;
    }
  }
  const wipLimit =
    targetColumn.wipLimit !== null && targetColumn.wipLimit !== undefined
      ? Number(targetColumn.wipLimit)
      : 0;

  if (wipLimit > 0) {
    const tasksInColumn = board.tasks.filter(
      (t) => t.columnId === targetColumnId && t.id !== taskId,
    );

    if (tasksInColumn.length >= wipLimit) {
      setshortError(`Move forbidden: WIP limit (${wipLimit}) reached`);
      return false;
    }
  }

  return true;
};

/**
 * Board drop handler that centralizes validation before dispatching the move.
 */
export const handleDrop = (
  state: BoardState,
  dispatch: Dispatch<BoardAction>,
  taskId: string,
  targetColumnId: string,
  setshortError: (message: string | null) => void,
) => {
  const resolvedStoryColumnId = getStoryColumnId(state.board);

  if (
    !canMoveTask(
      state.board,
      taskId,
      targetColumnId,
      resolvedStoryColumnId,
      setshortError,
    )
  )
    return;

  dispatch({
    type: 'MOVE_TASK',
    payload: { taskId, targetColumnId },
  });
};
