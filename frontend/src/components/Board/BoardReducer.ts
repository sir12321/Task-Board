import type { ProjectDetails, Board } from "../../types/Types";

export interface BoardState {
  board: Board;
  projectDetails: ProjectDetails;
}

export type BoardAction =
  | {
      type: "MOVE_TASK";
      payload: {
        taskId: string;
        targetColumnId: string;
      };
    }

export const BoardReducer = (
  state: BoardState,
  action: BoardAction
): BoardState => {
  switch (action.type) {
    case "MOVE_TASK": {
      const { taskId, targetColumnId } = action.payload;

      const task = state.board.tasks.find((t) => t.id === taskId);
      if (!task) return state;

      // Block moves for users with PROJECT_VIEWER role immediately
      const userRole = state.projectDetails?.userRole;
      if (userRole === 'PROJECT_VIEWER') {
        return state;
      }

      // WIP Enforcement
      const column = state.board.columns.find(
        (c) => c.id === targetColumnId
      );

      const sourceColumn = state.board.columns.find(
        (c) => c.id === task.columnId
      );

      if (sourceColumn && column) {
        const orderDiff = column.order - sourceColumn.order;
        if (orderDiff !== 1) {
          return state;
        }

        if (column.id === 'col-story' && task.type !== 'STORY') {
          return state;
        }

        if (task.type === 'STORY' && column.id !== 'col-story') {
          return state;
        }
      }

      const tasksInColumn = state.board.tasks.filter(
        (t) => t.columnId === targetColumnId
      );

      if (
        column?.wipLimit &&
        tasksInColumn.length >= column.wipLimit
      ) {
        return state;
      }

      const updatedTasks = state.board.tasks.map((t) =>
        t.id === taskId
          ? { ...t, columnId: targetColumnId, columnName: column?.name || t.columnName }
          : t
      );

      return {
        board: {
          ...state.board,
          tasks: updatedTasks,
        },
        projectDetails: state.projectDetails,
      };
    }

    default:
      return state;
  }
};