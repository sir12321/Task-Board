import { useReducer, useState, useEffect } from 'react';
import type {
  Board as BoardType,
  ProjectDetails,
  Task,
  TaskUpsertInput,
} from '../../types/Types';
import { BoardReducer } from './BoardReducer';
import type { BoardState } from './BoardReducer';
import Column from './Column';
import TaskDetailsModal from '../Task/TaskDetailsModal';
import TaskCreateEditModal from '../Task/TaskCreateEditModal';
import styles from './Board.module.css';

interface Props {
  board: BoardType;
  projectDetails: ProjectDetails;
  onDeleteTask?: (taskId: string) => Promise<void> | void;
  onCreateTask?: (payload: TaskUpsertInput) => Promise<void> | void;
  onUpdateTask?: (
    taskId: string,
    payload: TaskUpsertInput,
  ) => Promise<void> | void;
  onAddColumn?: (columnName: string) => Promise<void> | void;
  onRenameColumn?: (columnId: string, newName: string) => Promise<void> | void;
  onReorderColumn?: (
    columnId: string,
    direction: 'left' | 'right',
  ) => Promise<void> | void;
  onUpdateColumnWip?: (
    columnId: string,
    wipLimit: number | null,
  ) => Promise<void> | void;
  onDeleteColumn?: (columnId: string) => Promise<void> | void;
}

const Board = ({
  board,
  projectDetails,
  onDeleteTask,
  onCreateTask,
  onUpdateTask,
  onAddColumn,
  onRenameColumn,
  onReorderColumn,
  onUpdateColumnWip,
  onDeleteColumn,
}: Props) => {
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
  const [createColumnId, setCreateColumnId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [workflowEditMode, setWorkflowEditMode] = useState(false);

  const canManageTasks =
    state.projectDetails.userRole === 'PROJECT_ADMIN' ||
    state.projectDetails.userRole === 'PROJECT_MEMBER';
  const canManageColumns = state.projectDetails.userRole === 'PROJECT_ADMIN';
  const assignableMembers = state.projectDetails.members.filter(
    (member) =>
      member.role === 'PROJECT_ADMIN' || member.role === 'PROJECT_MEMBER',
  );

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

  const handleAddColumn = async () => {
    if (!canManageColumns) {
      setToast('Only ProjectAdmin can create columns');
      return;
    }

    const columnName = window.prompt('Enter column name');
    if (columnName === null) {
      return;
    }

    if (onAddColumn) {
      await onAddColumn(columnName);
      return;
    }

    dispatch({ type: 'ADD_COLUMN', payload: { name: columnName } });
  };

  const handleRenameColumn = async (columnId: string, currentName: string) => {
    if (!canManageColumns) {
      setToast('Only ProjectAdmin can rename columns');
      return;
    }

    const newName = window.prompt('Rename column', currentName);
    if (newName === null) {
      return;
    }

    if (onRenameColumn) {
      await onRenameColumn(columnId, newName);
      return;
    }

    dispatch({ type: 'RENAME_COLUMN', payload: { columnId, name: newName } });
  };

  const sortedColumns = state.board.columns
    .slice()
    .sort((a, b) => a.order - b.order);

  const handleMoveColumn = async (
    columnId: string,
    direction: 'left' | 'right',
  ) => {
    if (!canManageColumns) {
      setToast('Only ProjectAdmin can reorder columns');
      return;
    }

    if (columnId === 'col-story') {
      setToast('Stories column must stay first');
      return;
    }

    const currentIndex = sortedColumns.findIndex(
      (column) => column.id === columnId,
    );
    if (currentIndex === -1) {
      return;
    }
    const targetIndex =
      direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex >= 0 && sortedColumns[targetIndex]?.id === 'col-story') {
      setToast('Stories column must stay first');
      return;
    }

    if (onReorderColumn) {
      await onReorderColumn(columnId, direction);
      return;
    }

    dispatch({ type: 'REORDER_COLUMN', payload: { columnId, direction } });
  };

  const handleEditWip = async (columnId: string, currentWip: number | null) => {
    if (!canManageColumns) {
      setToast('Only ProjectAdmin can edit WIP limits');
      return;
    }

    const input = window.prompt(
      'Set WIP limit (empty means no limit)',
      currentWip === null ? '' : String(currentWip),
    );
    if (input === null) {
      return;
    }

    const trimmed = input.trim();
    let nextWip: number | null = null;
    if (trimmed !== '') {
      const parsed = Number(trimmed);
      if (!Number.isInteger(parsed) || parsed < 1) {
        setToast('WIP must be an integer >= 1, or empty for no limit');
        return;
      }
      nextWip = parsed;
    }

    if (onUpdateColumnWip) {
      await onUpdateColumnWip(columnId, nextWip);
      return;
    }

    dispatch({
      type: 'UPDATE_COLUMN_WIP',
      payload: { columnId, wipLimit: nextWip },
    });
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!canManageColumns) {
      setToast('Only ProjectAdmin can delete columns');
      return;
    }

    const column = sortedColumns.find((c) => c.id === columnId);
    if (!column) {
      return;
    }

    const confirmed = window.confirm(`Delete column "${column.name}"?`);
    if (!confirmed) {
      return;
    }

    if (onDeleteColumn) {
      await onDeleteColumn(columnId);
      return;
    }

    dispatch({ type: 'DELETE_COLUMN', payload: { columnId } });
  };

  return (
    <div style={{ padding: '20px' }}>
      <div className={styles.projectSection}>
        <div className={styles['project-name']}>
          {state.projectDetails.name}
        </div>
        <div className={styles['project-description']}>
          {state.projectDetails.description}
        </div>
        <div className={styles.abc}>
          <div className={styles.boardHeader}>
            <h2>{state.board.name}</h2>
            {canManageColumns && (
              <button
                type="button"
                className={styles.workflowModeButton}
                onClick={() => setWorkflowEditMode((prev) => !prev)}
              >
                {workflowEditMode ? 'Done Editing Workflow' : 'Edit Workflow'}
              </button>
            )}
          </div>

          <div className={styles.boardWorkspace}></div>
        </div>
      </div>

      <div className={styles.board}>
        {sortedColumns.map((column, index) =>
          (() => {
            const leftNeighbor = index > 0 ? sortedColumns[index - 1] : null;
            const rightNeighbor =
              index < sortedColumns.length - 1
                ? sortedColumns[index + 1]
                : null;
            const isStory = column.id === 'col-story';
            const canMoveLeft =
              !isStory && index > 0 && leftNeighbor?.id !== 'col-story';
            const canMoveRight =
              !isStory &&
              index < sortedColumns.length - 1 &&
              rightNeighbor?.id !== 'col-story';
            return (
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

                    const da = a.dueDate
                      ? new Date(a.dueDate).getTime()
                      : Infinity;
                    const db = b.dueDate
                      ? new Date(b.dueDate).getTime()
                      : Infinity;
                    if (da !== db) return da - db; // earlier due date first

                    return a.title.localeCompare(b.title);
                  })}
                isDraggable={state.projectDetails.userRole !== 'PROJECT_VIEWER'}
                onDropTask={handleDrop}
                onTaskClick={(taskId) => setSelectedTaskId(taskId)}
                onTaskEdit={(taskId) => {
                  if (!canManageTasks) {
                    setToast('You do not have permission to edit tasks');
                    return;
                  }
                  setEditingTaskId(taskId);
                }}
                canManageTasks={canManageTasks}
                onCreateTask={(columnId) => {
                  if (!canManageTasks) {
                    setToast('You do not have permission to create tasks');
                    return;
                  }
                  setCreateColumnId(columnId);
                }}
                canManageColumns={canManageColumns && workflowEditMode}
                onRenameColumn={(columnId) =>
                  handleRenameColumn(columnId, column.name)
                }
                canMoveLeft={canMoveLeft}
                canMoveRight={canMoveRight}
                onMoveLeft={(columnId) => handleMoveColumn(columnId, 'left')}
                onMoveRight={(columnId) => handleMoveColumn(columnId, 'right')}
                onEditWip={(columnId) =>
                  handleEditWip(columnId, column.wipLimit)
                }
                onDeleteColumn={(columnId) => handleDeleteColumn(columnId)}
              />
            );
          })(),
        )}
        {canManageColumns && workflowEditMode && (
          <button
            type="button"
            className={styles.addColumnButton}
            onClick={handleAddColumn}
          >
            + Add Column
          </button>
        )}
      </div>

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
              } catch {
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

      {createColumnId && (
        <TaskCreateEditModal
          mode="create"
          defaultColumnId={createColumnId}
          columns={state.board.columns}
          tasks={state.board.tasks}
          assignableMembers={assignableMembers}
          onClose={() => setCreateColumnId(null)}
          onSave={async (payload) => {
            if (onCreateTask) {
              await onCreateTask(payload);
              return;
            }

            const column = state.board.columns.find(
              (c) => c.id === payload.columnId,
            );
            const now = new Date().toISOString();
            dispatch({
              type: 'ADD_TASK',
              payload: {
                task: {
                  id: `task-${Date.now()}`,
                  title: payload.title,
                  description: payload.description ?? null,
                  type: payload.type,
                  priority: payload.priority,
                  dueDate: payload.dueDate,
                  createdAt: now,
                  updatedAt: now,
                  columnId: payload.columnId,
                  columnName: column?.name ?? 'Unknown',
                  reporterId: 'current-user',
                  assigneeId: payload.assigneeId ?? null,
                  parentId: payload.parentId ?? null,
                },
              },
            });
          }}
        />
      )}

      {editingTaskId && (
        <TaskCreateEditModal
          mode="edit"
          task={state.board.tasks.find((t) => t.id === editingTaskId)}
          defaultColumnId={
            state.board.tasks.find((t) => t.id === editingTaskId)?.columnId ??
            'col-backlog'
          }
          columns={state.board.columns}
          tasks={state.board.tasks}
          assignableMembers={assignableMembers}
          onClose={() => setEditingTaskId(null)}
          onSave={async (payload) => {
            if (onUpdateTask) {
              await onUpdateTask(editingTaskId, payload);
              return;
            }
            dispatch({
              type: 'UPDATE_TASK',
              payload: { taskId: editingTaskId, updates: payload },
            });
          }}
        />
      )}
    </div>
  );
};

export default Board;
