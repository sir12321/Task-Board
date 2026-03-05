import type { BoardColumn } from '../../types/Types';

/* ===================================== */
/* Column Generator */
/* ===================================== */

export const createColumns = (boardId: string): BoardColumn[] => [
  { id: 'col-story', name: 'Stories', boardId, order: 0, wipLimit: null },
  { id: 'col-backlog', name: 'To Do', boardId, order: 1, wipLimit: null },
  { id: 'col-progress', name: 'In Progress', boardId, order: 2, wipLimit: 3 },
  { id: 'col-review', name: 'Review', boardId, order: 3, wipLimit: 3 },
  { id: 'col-done', name: 'Done', boardId, order: 4, wipLimit: null },
];

/* ===================================== */
/* Board State Management */
/* ===================================== */

export const mockBoardColumns: Record<string, BoardColumn[]> = {
  'board-1': createColumns('board-1'),
  'board-2': createColumns('board-2'),
  'board-3': createColumns('board-3'),
};

/* ===================================== */
/* Helper Functions */
/* ===================================== */

export const cloneTasks = (tasks: any[]): any[] =>
  tasks.map((task) => ({ ...task }));

export const cloneColumns = (columns: BoardColumn[]): BoardColumn[] =>
  columns.map((column) => ({ ...column }));

export const ensureMandatoryColumns = (boardId: string, mandatoryColumnIds: string[]): void => {
  const columns = mockBoardColumns[boardId];
  if (!columns) return;

  const fallbackColumns = createColumns(boardId);
  for (const mandatoryColumnId of mandatoryColumnIds) {
    const exists = columns.some((column) => column.id === mandatoryColumnId);
    if (exists) continue;

    const fallback = fallbackColumns.find((column) => column.id === mandatoryColumnId);
    if (!fallback) continue;

    const maxOrder = columns.reduce((max, c) => Math.max(max, c.order), -1);
    columns.push({ ...fallback, order: maxOrder + 1 });
  }
};

export const getOrCreateBoardColumns = (boardId: string): BoardColumn[] => {
  if (!mockBoardColumns[boardId]) {
    mockBoardColumns[boardId] = createColumns(boardId);
  }
  return mockBoardColumns[boardId];
};
