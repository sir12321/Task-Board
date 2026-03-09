// import type { ProjectDetails, Board, BoardColumn } from '../../types/Types';
// import { mockProjects } from './mockData';
// import { mockBoardTasks } from './mockData';
// import {
//   mockBoardColumns,
//   createColumns,
//   ensureMandatoryColumns,
//   cloneColumns,
//   cloneTasks,
// } from './boardColumns';
// import {
//   mandatoryColumnIds,
// } from './constants';

// /* ===================================== */
// /* Project Board Selection & Resolution */
// /* ===================================== */

// export const resolveProjectBoardSelection = (
//   projectId: string,
//   boardId: string,
// ): { project: ProjectDetails; board: Board } | null => {
//   const project = mockProjects.find((p) => p.id === projectId);
//   if (!project) return null;

//   const boardMeta = project.boards.find((b) => b.id === boardId);
//   if (!boardMeta) return null;

//   ensureMandatoryColumns(boardMeta.id, mandatoryColumnIds);

//   const board: Board = {
//     id: boardMeta.id,
//     name: boardMeta.name,
//     projectId: project.id,
//     columns: cloneColumns(
//       mockBoardColumns[boardMeta.id] ?? createColumns(boardMeta.id),
//     ),
//     tasks: cloneTasks(mockBoardTasks[boardMeta.id] ?? []),
//   };

//   return { project, board };
// };

// /* ===================================== */
// /* Project Operations */
// /* ===================================== */

// export const createBoardForProject = (
//   projectId: string,
//   boardName: string,
// ): { id: string; name: string } | null => {
//   const project = mockProjects.find((p) => p.id === projectId);
//   if (!project || project.userRole !== 'PROJECT_ADMIN') {
//     return null;
//   }

//   const name = boardName.trim();
//   if (!name) {
//     return null;
//   }

//   let nextBoardId = 4;
//   let boardId = `board-${nextBoardId}`;
//   while (project.boards.some((b) => b.id === boardId)) {
//     nextBoardId += 1;
//     boardId = `board-${nextBoardId}`;
//   }

//   const newBoard = { id: boardId, name };
//   project.boards.push(newBoard);
//   mockBoardTasks[boardId] = [];
//   mockBoardColumns[boardId] = createColumns(boardId);

//   return newBoard;
// };

// export const updateProjectSettings = (
//   projectId: string,
//   updates: { name?: string; description?: string },
// ): ProjectDetails | null => {
//   const project = mockProjects.find((p) => p.id === projectId);
//   if (!project || project.userRole !== 'PROJECT_ADMIN') {
//     return null;
//   }

//   const nextName = updates.name?.trim();
//   const nextDescription = updates.description?.trim();

//   if (typeof updates.name === 'string' && !nextName) {
//     return null;
//   }

//   if (typeof updates.name === 'string') {
//     project.name = nextName!;
//   }

//   if (typeof updates.description === 'string') {
//     project.description = nextDescription ?? '';
//   }

//   return { ...project, boards: [...project.boards], members: [...project.members] };
// };

// /* ===================================== */
// /* Column Operations */
// /* ===================================== */

// export const addColumnToBoard = (
//   projectId: string,
//   boardId: string,
//   columnName: string,
// ): BoardColumn | null => {
//   const project = mockProjects.find((p) => p.id === projectId);
//   if (!project || project.userRole !== 'PROJECT_ADMIN') {
//     return null;
//   }

//   const name = columnName.trim();
//   if (!name) {
//     return null;
//   }

//   const columns = mockBoardColumns[boardId];
//   if (!columns) {
//     return null;
//   }
//   ensureMandatoryColumns(boardId, mandatoryColumnIds);

//   const maxOrder = columns.reduce((max, c) => Math.max(max, c.order), -1);
  
//   let nextCustomColumnId = 1;
//   const existingCustomIds = columns
//     .filter((col) => col.id.startsWith('col-custom-'))
//     .map((col) => parseInt(col.id.split('-')[2] ?? '0'));
//   if (existingCustomIds.length > 0) {
//     nextCustomColumnId = Math.max(...existingCustomIds) + 1;
//   }

//   const newColumn: BoardColumn = {
//     id: `col-custom-${nextCustomColumnId}`,
//     name,
//     boardId,
//     order: maxOrder + 1,
//     wipLimit: null,
//   };
//   columns.push(newColumn);
//   return { ...newColumn };
// };

// export const renameColumnInBoard = (
//   projectId: string,
//   boardId: string,
//   columnId: string,
//   newName: string,
// ): BoardColumn | null => {
//   const project = mockProjects.find((p) => p.id === projectId);
//   if (!project || project.userRole !== 'PROJECT_ADMIN') {
//     return null;
//   }

//   const name = newName.trim();
//   if (!name) {
//     return null;
//   }

//   const columns = mockBoardColumns[boardId];
//   if (!columns) {
//     return null;
//   }
//   ensureMandatoryColumns(boardId, mandatoryColumnIds);

//   const column = columns.find((c) => c.id === columnId);
//   if (!column) {
//     return null;
//   }

//   column.name = name;
//   return { ...column };
// };

// export const reorderColumnInBoard = (
//   projectId: string,
//   boardId: string,
//   columnId: string,
//   direction: 'left' | 'right',
// ): BoardColumn[] | null => {
//   const project = mockProjects.find((p) => p.id === projectId);
//   if (!project || project.userRole !== 'PROJECT_ADMIN') {
//     return null;
//   }

//   const columns = mockBoardColumns[boardId];
//   if (!columns) {
//     return null;
//   }
//   ensureMandatoryColumns(boardId, mandatoryColumnIds);

//   const ordered = [...columns].sort((a, b) => a.order - b.order);
//   const storyIndex = ordered.findIndex((column) => column.id === 'col-story');
//   if (storyIndex > 0) {
//     const [storyColumn] = ordered.splice(storyIndex, 1);
//     ordered.unshift(storyColumn);
//   }

//   if (columnId === 'col-story') {
//     const normalized = ordered.map((column, index) => ({ ...column, order: index }));
//     mockBoardColumns[boardId] = normalized;
//     return normalized.map((column) => ({ ...column }));
//   }

//   const currentIndex = ordered.findIndex((column) => column.id === columnId);
//   if (currentIndex < 0) {
//     return null;
//   }

//   const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
//   if (targetIndex < 0 || targetIndex >= ordered.length) {
//     return ordered.map((column) => ({ ...column }));
//   }
//   if (ordered[targetIndex]?.id === 'col-story') {
//     return ordered.map((column) => ({ ...column }));
//   }

//   const temp = ordered[currentIndex];
//   ordered[currentIndex] = ordered[targetIndex];
//   ordered[targetIndex] = temp;

//   const reordered = ordered.map((column, index) => ({ ...column, order: index }));
//   mockBoardColumns[boardId] = reordered;
//   return reordered.map((column) => ({ ...column }));
// };

// export const updateColumnWipInBoard = (
//   projectId: string,
//   boardId: string,
//   columnId: string,
//   wipLimit: number | null,
// ): BoardColumn | null => {
//   const project = mockProjects.find((p) => p.id === projectId);
//   if (!project || project.userRole !== 'PROJECT_ADMIN') {
//     return null;
//   }

//   const columns = mockBoardColumns[boardId];
//   if (!columns) {
//     return null;
//   }
//   ensureMandatoryColumns(boardId, mandatoryColumnIds);

//   const column = columns.find((c) => c.id === columnId);
//   if (!column) {
//     return null;
//   }

//   if (wipLimit !== null && (!Number.isInteger(wipLimit) || wipLimit < 1)) {
//     return null;
//   }

//   column.wipLimit = wipLimit;
//   return { ...column };
// };

// export const deleteColumnFromBoard = (
//   projectId: string,
//   boardId: string,
//   columnId: string,
// ): BoardColumn[] | null => {
//   const project = mockProjects.find((p) => p.id === projectId);
//   if (!project || project.userRole !== 'PROJECT_ADMIN') {
//     return null;
//   }

//   if (mandatoryColumnIds.includes(columnId)) {
//     return null;
//   }

//   const columns = mockBoardColumns[boardId];
//   if (!columns) {
//     return null;
//   }
//   ensureMandatoryColumns(boardId, mandatoryColumnIds);

//   const hasTasks = (mockBoardTasks[boardId] ?? []).some(
//     (task) => task.columnId === columnId,
//   );
//   if (hasTasks) {
//     return null;
//   }

//   const filtered = columns.filter((column) => column.id !== columnId);
//   if (filtered.length === columns.length) {
//     return null;
//   }

//   const normalized = filtered
//     .sort((a, b) => a.order - b.order)
//     .map((column, index) => ({ ...column, order: index }));

//   mockBoardColumns[boardId] = normalized;
//   return normalized.map((column) => ({ ...column }));
// };
