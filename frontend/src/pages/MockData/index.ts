/* Re-export everything from the organized modules */

// Constants & Configuration
export {
  nextBoardId,
  nextCustomColumnId,
  mandatoryColumnIds,
  setNextBoardId,
  setNextCustomColumnId,
  incrementNextBoardId,
  incrementNextCustomColumnId,
} from './constants';

// Mock Data
export { MockUser1, MockUser2, mockProjects, mockBoardTasks, nowIso } from './mockData';

// Board Columns
export {
  createColumns,
  mockBoardColumns,
  cloneTasks,
  cloneColumns,
  ensureMandatoryColumns,
  getOrCreateBoardColumns,
} from './boardColumns';

// Routing Helpers
export {
  buildBoardPath,
  defaultProjectId,
  defaultBoardId,
  defaultBoardPath,
} from './routingHelpers';

// Board Operations
export {
  resolveProjectBoardSelection,
  createBoardForProject,
  updateProjectSettings,
  addColumnToBoard,
  renameColumnInBoard,
  reorderColumnInBoard,
  updateColumnWipInBoard,
  deleteColumnFromBoard,
} from './boardOperations';

// Component
export { default as BoardPage } from './BoardPage';
