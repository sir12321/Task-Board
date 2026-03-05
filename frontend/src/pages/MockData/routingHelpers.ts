import { mockProjects } from './mockData';

/* ===================================== */
/* Routing helpers */
/* ===================================== */

export const buildBoardPath = (projectId: string, boardId: string): string =>
  `/projects/${projectId}/boards/${boardId}`;

export const defaultProjectId = mockProjects[0]?.id ?? '';
export const defaultBoardId = mockProjects[0]?.boards[0]?.id ?? '';

export const defaultBoardPath = buildBoardPath(
  defaultProjectId,
  defaultBoardId,
);
