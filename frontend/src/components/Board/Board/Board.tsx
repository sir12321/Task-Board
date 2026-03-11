import { useReducer, useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import type {
  Board as BoardType,
  ProjectDetails,
  Task,
  NewTaskInput,
} from '../../../types/Types';
import { BoardReducer } from './BoardReducer';
import type { BoardState } from './BoardReducer';
import Column from '../Column/Column';
import normalizeBoard from './normalizeBoard';
import { handleDrop as handleDropTask, canMoveTask } from './HandleDropTask';
import HandleRenameColumn from './RenameColumn';
import EditWIPColumn from './EditWIPColumn';
import AddColumn from './AddColumn';
import DeleteColumn from './DeleteColumn';
import TaskDetailsModal from '../Task/TaskDetailsModal/TaskDetailsModal';
import TaskCreateEditModal from '../Task/TaskCreate/TaskCreateEdit';
import styles from './Board.module.css';

// Props accepted by the Board component. All handler callbacks are optional to allow
// the board to function in both controlled (parent-managed) and internal state
// modes (useful for mock data or offline usage).
interface Props {
  board: BoardType;
  projectDetails: ProjectDetails;
  onDeleteTask?: (taskId: string) => Promise<void> | void;
  onCreateTask?: (payload: NewTaskInput) => Promise<void> | void;
  onUpdateTask?: (
    taskId: string,
    payload: NewTaskInput,
  ) => Promise<void> | void;
  onAddComment?: (taskId: string, content: string) => Promise<void> | void;
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
  onAddComment,
  onAddColumn,
  onRenameColumn,
  onReorderColumn,
  onUpdateColumnWip,
  onDeleteColumn,
}: Props) => {
  const { user } = useAuth();
  const StoryColumnId =
    board.columns.find((c) => c.order === 0)?.id ?? 'col-story';
  const StoryColumnName =
    board.columns.find((c) => c.order === 0)?.name ?? 'Stories';

  // Reducer state manages the board and project details locally. This enables
  // complex state transitions (task moves, column edits) while still allowing a
  // parent component to override via props handlers.
  const [state, dispatch] = useReducer(BoardReducer, {
    board: normalizeBoard({ board, StoryColumnId, StoryColumnName }),
    projectDetails,
  } as BoardState);
  const [shortError, setShortError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createColumnId, setCreateColumnId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [workflowEditMode, setWorkflowEditMode] = useState(false);
  const [renameColumnDialog, setRenameColumnDialog] = useState<{
    columnId: string;
    currentName: string;
  } | null>(null);
  const [wipDialog, setWipDialog] = useState<{
    columnId: string;
    currentWip: number | null;
    columnTaskCount: number;
  } | null>(null);
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [deleteColumnDialog, setDeleteColumnDialog] = useState<{
    columnId: string;
    columnName: string;
  } | null>(null);

  // Some Boolean Helpers
  const canManageTasks =
    state.projectDetails.userRole === 'PROJECT_ADMIN' ||
    state.projectDetails.userRole === 'PROJECT_MEMBER' ||
    user?.globalRole === 'GLOBAL_ADMIN';
  const canManageColumns =
    state.projectDetails.userRole === 'PROJECT_ADMIN' ||
    user?.globalRole === 'GLOBAL_ADMIN';
  const assignableMembers = state.projectDetails.members.filter(
    (member) =>
      member.role === 'PROJECT_ADMIN' || member.role === 'PROJECT_MEMBER',
  );

  // Automatically clear shortError messages after a brief interval
  useEffect(() => {
    if (!shortError) return;
    const id = setTimeout(() => setShortError(null), 3000);
    return () => clearTimeout(id);
  }, [shortError]);

  // If the `board` prop changes from the parent we need to update the reducer
  // state accordingly. This keeps the UI in sync with remote data loads.
  useEffect(() => {
    dispatch({
      type: 'SET_BOARD',
      payload: {
        board: normalizeBoard({ board, StoryColumnId, StoryColumnName }),
      },
    });
  }, [board]);

  const handleRenameColumn = async (columnId: string, newName: string) => {
    if (onRenameColumn) {
      try {
        await onRenameColumn(columnId, newName);
      } catch (err) {
        setShortError((err as Error)?.message ?? 'Failed to rename column');
      }
      return;
    }

    dispatch({ type: 'RENAME_COLUMN', payload: { columnId, name: newName } });
  };

  const handleSubmitWip = async (columnId: string, wipLimit: number | null) => {
    if (onUpdateColumnWip) {
      try {
        await onUpdateColumnWip(columnId, wipLimit);
      } catch (err) {
        setShortError((err as Error)?.message ?? 'Failed to update WIP limit');
      }
      return;
    }
    dispatch({ type: 'UPDATE_COLUMN_WIP', payload: { columnId, wipLimit } });
  };

  const openRenameColumn = (columnId: string, currentName: string) => {
    setRenameColumnDialog({ columnId, currentName });
  };

  const sortedColumns = state.board.columns
    .slice()
    .sort((a, b) => a.order - b.order);

  const handleSubmitAddColumn = async (columnName: string) => {
    if (onAddColumn) {
      try {
        await onAddColumn(columnName);
      } catch (err) {
        setShortError((err as Error)?.message || 'Failed to add column');
      }
      return;
    }
    dispatch({ type: 'ADD_COLUMN', payload: { name: columnName } });
  };

  const handleMoveColumn = async (
    columnId: string,
    direction: 'left' | 'right',
  ) => {
    const column = sortedColumns.find((c) => c.id === columnId);

    if (columnId === StoryColumnId) {
      setShortError(
        `${column?.name} column must stay first because it contains STORY tasks`,
      );
      return;
    }

    const currentIndex = sortedColumns.findIndex(
      (column) => column.id === columnId,
    );
    const targetIndex =
      direction === 'left' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= sortedColumns.length) {
      return;
    }

    if (onReorderColumn) {
      try {
        await onReorderColumn(columnId, direction);
      } catch (err) {
        setShortError((err as Error)?.message ?? 'Failed to move column');
      }
      return;
    }

    dispatch({ type: 'REORDER_COLUMN', payload: { columnId, direction } });
  };

  const handleSubmitDeleteColumn = async (columnId: string) => {
    if (onDeleteColumn) {
      try {
        await onDeleteColumn(columnId);
      } catch (err) {
        setShortError((err as Error)?.message ?? 'Failed to delete column');
      }
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
            // compute adjacency flags for move buttons
            const leftNeighbor = index > 0 ? sortedColumns[index - 1] : null;
            const rightNeighbor =
              index < sortedColumns.length - 1
                ? sortedColumns[index + 1]
                : null;
            const isStory = column.id === StoryColumnId;
            const canMoveLeft =
              !isStory && index > 0 && leftNeighbor?.id !== StoryColumnId;
            const canMoveRight =
              !isStory &&
              index < sortedColumns.length - 1 &&
              rightNeighbor?.id !== StoryColumnId;
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
                onDropTask={async (taskId, colId) => {
                  if (
                    !canMoveTask(
                      state.board,
                      taskId,
                      colId,
                      StoryColumnId,
                      setShortError,
                    )
                  ) {
                    return;
                  }

                  const task = state.board.tasks.find((t) => t.id === taskId);
                  if (!task) {
                    return;
                  }

                  const previousBoard = state.board;

                  handleDropTask(state, dispatch, taskId, colId, setShortError);

                  if (onUpdateTask) {
                    try {
                      await onUpdateTask(taskId, {
                        title: task.title,
                        description: task.description,
                        type: task.type,
                        priority: task.priority,
                        dueDate: task.dueDate,
                        assigneeId: task.assigneeId,
                        parentId: task.parentId,
                        columnId: colId,
                      });
                    } catch {
                      setShortError('Move rejected by server. Reverting...');
                      dispatch({
                        type: 'SET_BOARD',
                        payload: { board: previousBoard },
                      });
                    }
                  }
                }}
                onTaskClick={(taskId) => setSelectedTaskId(taskId)}
                onTaskEdit={(taskId) => {
                  setEditingTaskId(taskId);
                }}
                canManageTasks={canManageTasks}
                onCreateTask={(columnId) => {
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
                onEditWip={(columnId) => {
                  const taskCount = state.board.tasks.filter(
                    (t) => t.columnId === columnId,
                  ).length;
                  setWipDialog({
                    columnId,
                    currentWip: column.wipLimit,
                    columnTaskCount: taskCount,
                  });
                }}
                onDeleteColumn={(columnId) => {
                  const col = sortedColumns.find((c) => c.id === columnId);
                  if (col)
                    setDeleteColumnDialog({
                      columnId,
                      columnName: col.name,
                    });
                }}
              />
            );
          })(),
        )}
        {canManageColumns && workflowEditMode && (
          <button
            type="button"
            className={styles.addColumnButton}
            onClick={() => setAddColumnOpen(true)}
          >
            + Add Column
          </button>
        )}
      </div>

      {/* shortError notification area at bottom-right */}
      {shortError && (
        <div className={styles['shortError-bottom-right']}>{shortError}</div>
      )}

      {/* Add column modal */}
      {addColumnOpen && (
        <AddColumn
          onSubmit={handleSubmitAddColumn}
          onCancel={() => setAddColumnOpen(false)}
          setShortError={setShortError}
        />
      )}

      {/* Delete column confirmation modal */}
      {deleteColumnDialog && (
        <DeleteColumn
          columnId={deleteColumnDialog.columnId}
          columnName={deleteColumnDialog.columnName}
          onSubmit={handleSubmitDeleteColumn}
          onCancel={() => setDeleteColumnDialog(null)}
          setShortError={setShortError}
        />
      )}

      {/* WIP limit modal */}
      {wipDialog && (
        <EditWIPColumn
          columnId={wipDialog.columnId}
          currentWip={wipDialog.currentWip}
          columnTaskCount={wipDialog.columnTaskCount}
          onSubmit={handleSubmitWip}
          onCancel={() => setWipDialog(null)}
          setShortError={setShortError}
        />
      )}

      {/* column rename modal */}
      {canManageColumns && renameColumnDialog && (
        <HandleRenameColumn
          columnId={renameColumnDialog.columnId}
          currentName={renameColumnDialog.currentName}
          canManageColumns={canManageColumns && workflowEditMode}
          onSubmit={handleRenameColumn}
          onCancel={() => setRenameColumnDialog(null)}
          setShortError={setShortError}
        />
      )}

      {/* Task details modal, shown when a task is selected */}
      {selectedTaskId && (
        <TaskDetailsModal
          task={state.board.tasks.find((t) => t.id === selectedTaskId)!}
          userRole={state.projectDetails.userRole}
          currentUserId={user?.id}
          onClose={() => setSelectedTaskId(null)}
          onAddComment={async (content: string) => {
            if (onAddComment) {
              await onAddComment(selectedTaskId, content);
              return;
            }

            const now = new Date().toISOString();
            dispatch({
              type: 'SET_BOARD',
              payload: {
                board: {
                  ...state.board,
                  tasks: state.board.tasks.map((task) =>
                    task.id === selectedTaskId
                      ? {
                          ...task,
                          comments: [
                            ...(task.comments ?? []),
                            {
                              id: `comment-${Date.now()}`,
                              content,
                              createdAt: now,
                              updatedAt: now,
                              authorId: user?.id ?? 'current-user',
                              authorName: user?.name ?? 'Current User',
                              taskId: selectedTaskId,
                            },
                          ],
                        }
                      : task,
                  ),
                },
              },
            });
          }}
        />
      )}

      {/* Create task modal triggered by column create action */}
      {createColumnId && (
        <TaskCreateEditModal
          mode="create"
          defaultStoryColumnId={StoryColumnId}
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
                  status:
                    payload.type === 'STORY'
                      ? 'In-progress'
                      : (column?.name ?? 'Unknown'),
                  reporterId: 'current-user',
                  reporterName: 'Current User',
                  assigneeId: payload.assigneeId ?? null,
                  assigneeName:
                    assignableMembers.find((m) => m.id === payload.assigneeId)
                      ?.name ?? null,
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
          defaultStoryColumnId={StoryColumnId}
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
          onDelete={async (taskId: string) => {
            if (!projectDetails) return;
            if (onDeleteTask) {
              try {
                await onDeleteTask(taskId);
              } catch {
                // parent handler failed — surface a shortError
                setShortError('Failed to delete task');
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
