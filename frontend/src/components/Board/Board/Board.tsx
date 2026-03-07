import { useReducer, useState, useEffect } from 'react';
import type {
  Board as BoardType,
  ProjectDetails,
  Task,
  TaskUpsertInput,
} from '../../../types/Types';
import { BoardReducer } from './BoardReducer';
import type { BoardState } from './BoardReducer';
import Column from '../Column/Column';
import { handleDrop as handleDropTask } from './HandleDropTask';
import HandleRenameColumn from './RenameColumn';
import TaskDetailsModal from '../Task/TaskDetailsModal/TaskDetailsModal';
import TaskCreateEditModal from '../Task/TaskCreate/TaskCreateEditModal';
import styles from './Board.module.css';

// Props accepted by the Board component. All handler callbacks are optional to allow
// the board to function in both controlled (parent-managed) and internal state
// modes (useful for mock data or offline usage).
interface Props {
  board: BoardType;
  projectDetails: ProjectDetails;
  // task CRUD handlers
  onDeleteTask?: (taskId: string) => Promise<void> | void;
  onCreateTask?: (payload: TaskUpsertInput) => Promise<void> | void;
  onUpdateTask?: (
    taskId: string,
    payload: TaskUpsertInput,
  ) => Promise<void> | void;
  // column workflow handlers
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
  // Normalization helper that ensures all story-type tasks are assigned to the
  // reserved "Stories" column (col-story). This simplifies downstream logic by
  // guaranteeing that story tasks won't appear elsewhere.
  const normalizeBoard = (b: BoardType): BoardType => ({
    ...b,
    tasks: b.tasks.map((t) =>
      t.type === 'STORY' ? { ...t, columnId: 'col-story' } : t,
    ),
  });

  // Reducer state manages the board and project details locally. This enables
  // complex state transitions (task moves, column edits) while still allowing a
  // parent component to override via props handlers.
  const [state, dispatch] = useReducer(BoardReducer, {
    board: normalizeBoard(board),
    projectDetails,
  } as BoardState);

  // If the `board` prop changes from the parent we need to update the reducer
  // state accordingly. This keeps the UI in sync with remote data loads.
  useEffect(() => {
    dispatch({ type: 'SET_BOARD', payload: { board: normalizeBoard(board) } });
  }, [board]);

  // Toast state for showing short-lived error messages
  // UI state
  const [toast, setToast] = useState<string | null>(null); // short-lived notifications
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null); // open details modal
  const [createColumnId, setCreateColumnId] = useState<string | null>(null); // open create modal
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null); // open edit modal
  const [workflowEditMode, setWorkflowEditMode] = useState(false); // toggle workflow editing

  // Compute permissions derived from the user's role. Viewer-only users
  // cannot modify anything while members and admins have incremental access.
  const canManageTasks =
    state.projectDetails.userRole === 'PROJECT_ADMIN' ||
    state.projectDetails.userRole === 'PROJECT_MEMBER';
  const canManageColumns = state.projectDetails.userRole === 'PROJECT_ADMIN';
  // Only admins/members should be assigned tasks
  const assignableMembers = state.projectDetails.members.filter(
    (member) =>
      member.role === 'PROJECT_ADMIN' || member.role === 'PROJECT_MEMBER',
  );

  // Automatically clear toast messages after a brief interval
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  // move validation logic lives in ./MoveTask.tsx now; import and use it

  // state used only for the rename dialog
  const [renameColumn, setRenameColumn] = useState<{
    columnId: string;
    currentName: string;
  } | null>(null);

  // perform a rename; same semantics that previously existed inline
  const handleRenameColumn = async (columnId: string, newName: string) => {
    if (!canManageColumns) {
      setToast('Only ProjectAdmin can rename columns');
      return;
    }

    if (onRenameColumn) {
      await onRenameColumn(columnId, newName);
      return;
    }

    dispatch({ type: 'RENAME_COLUMN', payload: { columnId, name: newName } });
  };

  const openRenameColumn = (columnId: string, currentName: string) => {
    setRenameColumn({ columnId, currentName });
  };

  // Task drop logic has been moved to the MoveTask helper. The component
  // simply forwards necessary state/dispatch to that function when a drop
  // occurs (see `onDropTask` prop further below).

  // Maintain a sorted copy of columns based on their order property. This
  // is used throughout the rendering logic to ensure columns appear in the
  // correct sequence, independent of the underlying array order.
  const sortedColumns = state.board.columns
    .slice()
    .sort((a, b) => a.order - b.order);

  // Add a new column to the board. This function shows a prompt, checks
  // permissions, and either calls a parent handler or updates the reducer
  // directly. The async signature allows parent handlers to perform network
  // requests before updating state.
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

  // Move a column left or right in the workflow. There are several guards:
  // 1. Only admins can perform it.
  // 2. The special 'Stories' column cannot be moved past first.
  // 3. We don't allow swapping with the story column.
  // After validation either call parent handler or update state directly.
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

  // Prompt the user to update the WIP (work-in-progress) limit on a column.
  // Performs input validation to ensure the limit is a positive integer or
  // left empty. Delegates to parent or reducer accordingly.
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

  // Delete a column after confirming with the user. Only admins may
  // perform this action. The confirmation step avoids accidental data loss.
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
      {/* Project header section showing name/description and workflow toggle */}
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

      {/* Columns and tasks area */}
      <div className={styles.board}>
        {sortedColumns.map((column, index) =>
          (() => {
            // compute adjacency flags for move buttons
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
                userRole={state.projectDetails.userRole}
                column={column}
                // sort tasks within column by priority, due date, title
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
                onDropTask={(taskId, colId) =>
                  handleDropTask(state, dispatch, taskId, colId, setToast)
                }
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
                  openRenameColumn(columnId, column.name)
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

      {/* Toast notification area at bottom-right */}
      {toast && <div className={styles['toast-bottom-right']}>{toast}</div>}

      {/* column rename modal */}
      {renameColumn && (
        <HandleRenameColumn
          columnId={renameColumn.columnId}
          currentName={renameColumn.currentName}
          canManageColumns={canManageColumns && workflowEditMode}
          onSubmit={handleRenameColumn}
          onCancel={() => setRenameColumn(null)}
          setToast={setToast}
        />
      )}

      {/* Task details modal, shown when a task is selected */}
      {selectedTaskId && (
        <TaskDetailsModal
          task={state.board.tasks.find((t) => t.id === selectedTaskId)!}
          userRole={state.projectDetails.userRole}
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

      {/* Create task modal triggered by column create action */}
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
                  status: column?.name ?? 'Unknown',
                  reporterId: 'current-user',
                  assigneeId: payload.assigneeId ?? null,
                  parentId: payload.parentId ?? null,
                },
              },
            });
          }}
        />
      )}

      {/* Edit task modal shown when editingTaskId is set */}
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
