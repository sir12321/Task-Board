import type { Board } from "../../types/Board";

export interface BoardState {
  board: Board;
}

export type BoardAction =
  | {
      type: "MOVE_TASK";
      payload: {
        taskId: string;
        targetColumnId: string;
      };
    }
  | {
      type: "SET_BOARD";
      payload: Board;
    };

export const BoardReducer = (
  state: BoardState,
  action: BoardAction
): BoardState => {
  switch (action.type) {
    case "SET_BOARD":
      return { board: action.payload };

    case "MOVE_TASK": {
      const { taskId, targetColumnId } = action.payload;

      const task = state.board.tasks.find((t) => t.id === taskId);
      if (!task) return state;

      // WIP Enforcement
      const column = state.board.columns.find(
        (c) => c.id === targetColumnId
      );

      const sourceColumn = state.board.columns.find(
        (c) => c.id === task.status
      );

      if (sourceColumn && column) {
        const orderDiff = Math.abs(sourceColumn.order - column.order);
        if (orderDiff !== 1) {
          // Non-consecutive move; block it.
          return state;
        }
      }

      const tasksInColumn = state.board.tasks.filter(
        (t) => t.status === targetColumnId
      );

      if (
        column?.wipLimit &&
        tasksInColumn.length >= column.wipLimit
      ) {
        return state; // BLOCK move
      }

      const updatedTasks = state.board.tasks.map((t) =>
        t.id === taskId ? { ...t, status: targetColumnId } : t
      );

      return {
        board: {
          ...state.board,
          tasks: updatedTasks,
        },
      };
    }

    default:
      return state;
  }
};