import { useReducer, useState, useEffect } from 'react';
import type { Board as BoardType } from '../../types/Board';
import { BoardReducer } from './BoardReducer';
import type { BoardState } from './BoardReducer';
import Column from './Column';
import TaskDetailsModal from '../Task/TaskDetailsModal';
import styles from './Board.module.css';

interface Props {
  board: BoardType;
}

const Board = ({ board }: Props) => {
  const [state, dispatch] = useReducer(BoardReducer, {
    board,
  } as BoardState);

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

    // WIP enforcement
    const tasksInColumn = state.board.tasks.filter(
      (t) => t.status === targetColumnId,
    );
    if (
      targetColumn.wipLimit &&
      tasksInColumn.length >= targetColumn.wipLimit
    ) {
      setToast('Move forbidden: WIP limit reached');
      return false;
    }

    // Consecutive move enforcement: only allow moves to adjacent columns
    const sourceColumn = state.board.columns.find((c) => c.id === task.status);
    if (sourceColumn) {
      const orderDiff = Math.abs(sourceColumn.order - targetColumn.order);
      if (orderDiff !== 1) {
        setToast('Move forbidden: only consecutive moves allowed');
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
            tasks={state.board.tasks.filter((t) => t.status === column.id)}
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
        />
      )}
    </div>
  );
};

export default Board;
