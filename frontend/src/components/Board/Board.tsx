import { useReducer, useState, useEffect } from 'react';
import type { Board as BoardType, ProjectDetails, Task } from '../../types/Types';
import { BoardReducer } from './BoardReducer';
import type { BoardState } from './BoardReducer';
import Column from './Column';
import TaskDetailsModal from '../Task/TaskDetailsModal';
import styles from './Board.module.css';

interface Props {
  board: BoardType;
  projectDetails: ProjectDetails;
  onDeleteTask?: (taskId: string) => Promise<void> | void;
}

const Board = ({ board, projectDetails, onDeleteTask }: Props) => {
  const normalizeBoard = (b: BoardType): BoardType => ({
    ...b,
    tasks: b.tasks.map((t) =>
      t.type === 'STORY' ? { ...t, columnId: 'col-story' } : t,
    ),
  });

  const [state, dispatch] = useReducer(BoardReducer, {
    board: normalizeBoard(board),
    projectDetails,
  } as BoardState);

  // Sync external board prop into reducer state when it changes
  useEffect(() => {
    dispatch({ type: 'SET_BOARD', payload: { board: normalizeBoard(board) } });
  }, [board]);

  // Toast state for showing short-lived error messages
  const [toast, setToast] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  // Validate whether a task can move to the target column.
  // Returns true if move is allowed; otherwise shows toast and returns false.
  const canMoveTask = (taskId: string, targetColumnId: string) => {
    const task = state.board.tasks.find((t) => t.id === taskId);
    if (!task) return false;

    const targetColumn = state.board.columns.find(
      (c) => c.id === targetColumnId,
    );
    if (!targetColumn) return false;

    // Disallow non-story tasks from being moved into the dedicated story column
    if (targetColumn.id === 'col-story' && task.type !== 'STORY') {
      setToast('Move forbidden: only stories can go into the Stories column');
      return false;
    }

    // Prevent STORY tasks from being moved out of the story column
    if (task.type === 'STORY' && targetColumn.id !== 'col-story') {
      setToast('Move forbidden: stories must remain in the Stories column');
      return false;
    }

    // WIP enforcement
    const tasksInColumn = state.board.tasks.filter(
      (t) => t.columnId === targetColumnId,
    );
    if (
      targetColumn.wipLimit &&
      tasksInColumn.length >= targetColumn.wipLimit
    ) {
      setToast('Move forbidden: WIP limit reached');
      return false;
    }

    // Column-order enforcement: only allow moves to the adjacent next column
    // (i.e., move forward by exactly 1). Disallow backward moves or jumps.
    const sourceColumn = state.board.columns.find(
      (c) => c.id === task.columnId,
    );
    if (sourceColumn) {
      const orderDiff = targetColumn.order - sourceColumn.order;
      if (orderDiff !== 1) {
        setToast('Move forbidden: only adjacent forward moves are allowed');
        return false;
      }
    }

    return true;
  };

  const handleDrop = (taskId: string, columnId: string) => {
    if (!canMoveTask(taskId, columnId)) return;

    dispatch({
      type: 'MOVE_TASK',
      payload: { taskId, targetColumnId: columnId },
    });
  };

  return (
    <div className={styles.board}>
      {state.board.columns
        .sort((a, b) => a.order - b.order)
        .map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={state.board.tasks
              .filter((t) => t.columnId === column.id)
              .sort((a: Task, b: Task) => {
                const priorityOrder: Record<string, number> = {
                  CRITICAL: 4,
                  HIGH: 3,
                  MEDIUM: 2,
                  LOW: 1,
                };

                const pa = priorityOrder[a.priority] ?? 0;
                const pb = priorityOrder[b.priority] ?? 0;
                if (pa !== pb) return pb - pa; // higher priority first

                const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                if (da !== db) return da - db; // earlier due date first

                return a.title.localeCompare(b.title);
              })}
            isDraggable={state.projectDetails.userRole !== 'PROJECT_VIEWER'}
            onDropTask={handleDrop}
            onTaskClick={(taskId) => setSelectedTaskId(taskId)}
          />
        ))}

      {/* Toast */}
      {toast && <div className={styles['toast-bottom-right']}>{toast}</div>}

      {/* Modal */}
      {selectedTaskId && (
        <TaskDetailsModal
          task={state.board.tasks.find((t) => t.id === selectedTaskId)!}
          onClose={() => setSelectedTaskId(null)}
          onDelete={async (taskId: string) => {
            if (!projectDetails) return;
            if (onDeleteTask) {
              try {
                await onDeleteTask(taskId);
              } catch (e) {
                // parent handler failed — surface a toast
                setToast('Failed to delete task');
              }
            } else {
              dispatch({ type: 'DELETE_TASK', payload: { taskId } });
            }
            setSelectedTaskId(null);
          }}
        />
      )}
    </div>
  );
};

export default Board;
