import type {
  Board,
  BoardWorkflow,
  BoardColumn,
  Task,
} from '../../../types/Types';

export const getStoryColumnId = (board: Board): string =>
  board.storyColumnId ??
  board.columns.find((column) => column.order === 0)?.id ??
  '';

export const getWorkflowSequence = (workflow: BoardWorkflow): string[] =>
  workflow.workflowColumnIds.filter((columnId): columnId is string =>
    Boolean(columnId),
  );

export const getWorkflowStep = (
  workflow: BoardWorkflow,
  columnId: string,
): number => getWorkflowSequence(workflow).findIndex((id) => id === columnId);

export const isResolvedColumn = (
  workflow: BoardWorkflow,
  columnId: string,
): boolean =>
  workflow.resolvedColumnId === columnId ||
  workflow.closedColumnId === columnId;

export const isClosedColumn = (
  workflow: BoardWorkflow,
  columnId: string,
): boolean => workflow.closedColumnId === columnId;

export const getColumnNameById = (
  columns: BoardColumn[],
  columnId: string | null,
): string | null =>
  columnId
    ? (columns.find((column) => column.id === columnId)?.name ?? null)
    : null;

export const getTaskStatus = (board: Board, task: Task): string => {
  if (task.type !== 'STORY') {
    return getColumnNameById(board.columns, task.columnId) ?? task.columnName;
  }

  const childSteps = board.tasks
    .filter((candidate) => candidate.parentId === task.id)
    .map((candidate) => ({
      task: candidate,
      step: getWorkflowStep(board, candidate.columnId),
    }))
    .filter((entry) => entry.step >= 0)
    .sort((left, right) => left.step - right.step);

  return (
    childSteps[0]?.task.columnName ??
    getColumnNameById(board.columns, board.workflowColumnIds[0] ?? null) ??
    'To Do'
  );
};
