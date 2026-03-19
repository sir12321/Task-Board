import type {
  ProjectDetails,
  Board,
  Task,
  NewTaskInput,
} from '../../../types/Types';

export interface BoardState {
  board: Board;
  projectDetails: ProjectDetails;
}

export type BoardAction =
  | {
      type: 'MOVE_TASK';
      payload: {
        taskId: string;
        targetColumnId: string;
      };
    }
  | {
      type: 'SET_BOARD';
      payload: {
        board: Board;
      };
    }
  | {
      type: 'DELETE_TASK';
      payload: {
        taskId: string;
      };
    }
  | {
      type: 'ADD_TASK';
      payload: {
        task: Task;
      };
    }
  | {
      type: 'UPDATE_TASK';
      payload: {
        taskId: string;
        updates: NewTaskInput;
      };
    }
  | {
      type: 'ADD_COLUMN';
      payload: {
        name: string;
      };
    }
  | {
      type: 'RENAME_COLUMN';
      payload: {
        columnId: string;
        name: string;
      };
    }
  | {
      type: 'REORDER_COLUMN';
      payload: {
        columnId: string;
        direction: 'left' | 'right';
      };
    }
  | {
      type: 'UPDATE_COLUMN_WIP';
      payload: {
        columnId: string;
        wipLimit: number | null;
      };
    }
  | {
      type: 'DELETE_COLUMN';
      payload: {
        columnId: string;
      };
    };

export const BoardReducer = (
  state: BoardState,
  action: BoardAction,
): BoardState => {
  const storyColumnId = state.board.columns[0]?.id ?? 'col-story';
  switch (action.type) {
    case 'MOVE_TASK': {
      const { taskId, targetColumnId } = action.payload;

      const task = state.board.tasks.find((t) => t.id === taskId);
      if (!task) return state;

      // Block moves for users with PROJECT_VIEWER role immediately
      const userRole = state.projectDetails?.userRole;
      if (userRole === 'PROJECT_VIEWER') {
        return state;
      }

      // WIP Enforcement
      const column = state.board.columns.find((c) => c.id === targetColumnId);

      const sourceColumn = state.board.columns.find(
        (c) => c.id === task.columnId,
      );

      const storyColumnId =
        state.board.columns.find((c) => c.order === 0)?.id || 'col-story';

      if (sourceColumn && column) {
        const orderDiff = column.order - sourceColumn.order;
        if (orderDiff !== 1) {
          return state;
        }

        if (column.id === storyColumnId && task.type !== 'STORY') {
          return state;
        }

        if (task.type === 'STORY' && column.id !== storyColumnId) {
          return state;
        }
      }

      const tasksInColumn = state.board.tasks.filter(
        (t) => t.columnId === targetColumnId,
      );

      if (column?.wipLimit && tasksInColumn.length >= column.wipLimit) {
        return state;
      }

      const updatedTasks = state.board.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              columnId: targetColumnId,
              columnName: column?.name || t.columnName,
            }
          : t,
      );

      return {
        board: {
          ...state.board,
          tasks: updatedTasks,
        },
        projectDetails: state.projectDetails,
      };
    }

    case 'SET_BOARD': {
      return {
        board: action.payload.board,
        projectDetails: state.projectDetails,
      };
    }

    case 'DELETE_TASK': {
      const { taskId } = action.payload;
      return {
        board: {
          ...state.board,
          tasks: state.board.tasks.filter((t) => t.id !== taskId),
        },
        projectDetails: state.projectDetails,
      };
    }

    case 'ADD_TASK': {
      return {
        board: {
          ...state.board,
          tasks: [action.payload.task, ...state.board.tasks],
        },
        projectDetails: state.projectDetails,
      };
    }

    case 'UPDATE_TASK': {
      const { taskId, updates } = action.payload;
      return {
        board: {
          ...state.board,
          tasks: state.board.tasks.map((task) => {
            if (task.id !== taskId) return task;

            const assigneeName =
              updates.assigneeId === undefined
                ? task.assigneeName
                : (state.projectDetails.members.find(
                    (member) => member.id === updates.assigneeId,
                  )?.name ?? null);

            const parentName =
              updates.parentId === undefined
                ? task.parentName
                : (state.board.tasks.find(
                    (candidate) => candidate.id === updates.parentId,
                  )?.title ?? null);

            return {
              ...task,
              ...updates,
              description: updates.description ?? null,
              assigneeId: updates.assigneeId ?? null,
              assigneeName,
              parentId: updates.parentId ?? null,
              parentName,
              updatedAt: new Date().toISOString(),
            };
          }),
        },
        projectDetails: state.projectDetails,
      };
    }

    case 'ADD_COLUMN': {
      const name = action.payload.name.trim();
      if (!name) return state;

      if (state.projectDetails.userRole !== 'PROJECT_ADMIN') {
        return state;
      }

      const maxOrder = state.board.columns.reduce(
        (max, column) => Math.max(max, column.order),
        -1,
      );
      return {
        board: {
          ...state.board,
          columns: [
            ...state.board.columns,
            {
              id: `col-custom-${Date.now()}`,
              name,
              boardId: state.board.id,
              order: maxOrder + 1,
              wipLimit: null,
            },
          ],
        },
        projectDetails: state.projectDetails,
      };
    }

    case 'RENAME_COLUMN': {
      const { columnId, name } = action.payload;
      const trimmedName = name.trim();
      if (!trimmedName) return state;

      if (state.projectDetails.userRole !== 'PROJECT_ADMIN') {
        return state;
      }

      return {
        board: {
          ...state.board,
          columns: state.board.columns.map((column) =>
            column.id === columnId ? { ...column, name: trimmedName } : column,
          ),
          tasks: state.board.tasks.map((task) =>
            task.columnId === columnId
              ? {
                  ...task,
                  columnName: trimmedName,
                  updatedAt: new Date().toISOString(),
                }
              : task,
          ),
        },
        projectDetails: state.projectDetails,
      };
    }

    case 'REORDER_COLUMN': {
      if (state.projectDetails.userRole !== 'PROJECT_ADMIN') {
        return state;
      }

      if (action.payload.columnId === storyColumnId) {
        return state;
      }

      const ordered = [...state.board.columns].sort(
        (a, b) => a.order - b.order,
      );
      const currentIndex = ordered.findIndex(
        (column) => column.id === action.payload.columnId,
      );
      if (currentIndex < 0) {
        return state;
      }

      const targetIndex =
        action.payload.direction === 'left'
          ? currentIndex - 1
          : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= ordered.length) {
        return state;
      }
      if (ordered[targetIndex]?.id === storyColumnId) {
        return state;
      }

      const temp = ordered[currentIndex];
      ordered[currentIndex] = ordered[targetIndex];
      ordered[targetIndex] = temp;

      return {
        board: {
          ...state.board,
          columns: ordered.map((column, index) => ({
            ...column,
            order: index,
          })),
        },
        projectDetails: state.projectDetails,
      };
    }

    case 'UPDATE_COLUMN_WIP': {
      if (state.projectDetails.userRole !== 'PROJECT_ADMIN') {
        return state;
      }

      const { columnId, wipLimit } = action.payload;
      if (wipLimit !== null && (!Number.isInteger(wipLimit) || wipLimit < 1)) {
        return state;
      }

      return {
        board: {
          ...state.board,
          columns: state.board.columns.map((column) =>
            column.id === columnId ? { ...column, wipLimit } : column,
          ),
        },
        projectDetails: state.projectDetails,
      };
    }

    case 'DELETE_COLUMN': {
      if (state.projectDetails.userRole !== 'PROJECT_ADMIN') {
        return state;
      }
      const todoColumnId = state.board.columns[1]?.id;
      const doneColumnId =
        state.board.columns[state.board.columns.length - 1]?.id;
      const { columnId } = action.payload;
      if ([storyColumnId, todoColumnId, doneColumnId].includes(columnId)) {
        return state;
      }

      const hasTasks = state.board.tasks.some(
        (task) => task.columnId === columnId,
      );
      if (hasTasks) {
        return state;
      }

      const remainingColumns = state.board.columns
        .filter((column) => column.id !== columnId)
        .sort((a, b) => a.order - b.order)
        .map((column, index) => ({ ...column, order: index }));

      return {
        board: {
          ...state.board,
          columns: remainingColumns,
        },
        projectDetails: state.projectDetails,
      };
    }

    default:
      return state;
  }
};
