import { useReducer, useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import type {
  Board as BoardType,
  BoardWorkflow,
  ProjectDetails,
  Task,
  NewTaskInput,
} from '../../../types/Types';
import { BoardReducer } from './BoardReducer';
import type { BoardState } from './BoardReducer';
import Column from '../Column/Column';
import normalizeBoard from './normalizeBoard';
import { handleDrop as handleDropTask, canMoveTask } from './HandleDropTask';
import BoardModals from './BoardModals';
import { useBoardActions } from './useBoardActions';
import styles from './Board.module.css';
import { getStoryColumnId } from './workflow';

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
  onEditComment?: (commentId: string, content: string) => Promise<void> | void;
  onDeleteComment?: (commentId: string) => Promise<void> | void;
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
  onUpdateWorkflow?: (workflow: BoardWorkflow) => Promise<void> | void;
}

const Board = ({
  board,
  projectDetails,
  onDeleteTask,
  onCreateTask,
  onUpdateTask,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onAddColumn,
  onRenameColumn,
  onReorderColumn,
  onUpdateColumnWip,
  onDeleteColumn,
  onUpdateWorkflow,
}: Props) => {
  const { user } = useAuth();
  const StoryColumnId = getStoryColumnId(board);
  const StoryColumnName =
    board.columns.find((c) => c.id === StoryColumnId)?.name ?? 'Stories';

  const [state, dispatch] = useReducer(BoardReducer, {
    board: normalizeBoard({ board, StoryColumnId, StoryColumnName }),
    projectDetails,
  } as BoardState);
  const [shortError, setShortError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createColumnId, setCreateColumnId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [pendingWorkflowColumnDelete, setPendingWorkflowColumnDelete] =
    useState<string | null>(null);
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

  const effectiveProjectRole =
    user?.globalRole === 'GLOBAL_ADMIN'
      ? 'PROJECT_ADMIN'
      : state.projectDetails.userRole;

  const projectRoleLabel =
    effectiveProjectRole === 'PROJECT_ADMIN'
      ? 'Project Admin'
      : effectiveProjectRole === 'PROJECT_MEMBER'
        ? 'Project Member'
        : 'Viewer';

  const canManageTasks =
    effectiveProjectRole === 'PROJECT_ADMIN' ||
    effectiveProjectRole === 'PROJECT_MEMBER' ||
    user?.globalRole === 'GLOBAL_ADMIN';
  const canManageColumns =
    effectiveProjectRole === 'PROJECT_ADMIN' ||
    user?.globalRole === 'GLOBAL_ADMIN';
  const assignableMembers = state.projectDetails.members.filter(
    (member) =>
      member.role === 'PROJECT_ADMIN' || member.role === 'PROJECT_MEMBER',
  );

  const mentionableProjectMembers = state.projectDetails.members.filter(
    (member) => member.id !== user?.id,
  );

  useEffect(() => {
    if (!shortError) return;
    const id = setTimeout(() => setShortError(null), 3000);
    return () => clearTimeout(id);
  }, [shortError]);

  useEffect(() => {
    dispatch({
      type: 'SET_BOARD',
      payload: {
        board: normalizeBoard({ board, StoryColumnId, StoryColumnName }),
      },
    });
  }, [StoryColumnId, StoryColumnName, board]);

  useEffect(() => {
    if (!pendingWorkflowColumnDelete) {
      return;
    }

    const deletedColumnIsGone = !state.board.columns.some(
      (column) => column.id === pendingWorkflowColumnDelete,
    );

    if (!deletedColumnIsGone) {
      return;
    }

    setWorkflowDialogOpen(true);
    setPendingWorkflowColumnDelete(null);
  }, [pendingWorkflowColumnDelete, state.board.columns]);

  const sortedColumns = state.board.columns
    .slice()
    .sort((a, b) => a.order - b.order);

  const {
    handleRenameColumn,
    handleSubmitWip,
    dispatchBoardUpdate,
    handleSubmitAddColumn,
    handleMoveColumn,
    handleSubmitDeleteColumn,
    handleSubmitWorkflow,
  } = useBoardActions({
    onRenameColumn,
    onUpdateColumnWip,
    onAddColumn,
    onReorderColumn,
    onDeleteColumn,
    onUpdateWorkflow,
    setShortError,
    dispatch,
    state,
    sortedColumns,
    setPendingWorkflowColumnDelete,
    StoryColumnId,
  });

  const openRenameColumn = (columnId: string, currentName: string) => {
    setRenameColumnDialog({ columnId, currentName });
  };

  return (
    <div className={styles.page}>
      <div className={styles.projectSection}>
        <div className={styles['project-name']}>
          {state.projectDetails.name}
        </div>
        <div className={styles['project-description']}>
          {state.projectDetails.description}
        </div>
        <div className={styles.projectRoleChip}>{projectRoleLabel}</div>
        <div className={styles.boardHeader}>
          <h2>{state.board.name}</h2>
          {canManageColumns && (
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.workflowModeButton}
                onClick={() => setWorkflowDialogOpen(true)}
              >
                Edit Workflow
              </button>
              <button
                type="button"
                className={styles.workflowModeButton}
                onClick={() => setLayoutEditMode((prev) => !prev)}
              >
                {layoutEditMode ? 'Done Editing Layout' : 'Edit Layout'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.boardViewport}>
        <div className={styles.board}>
          {sortedColumns.map((column, index) =>
            (() => {
              const leftNeighbor = index > 0 ? sortedColumns[index - 1] : null;
              const rightNeighbor =
                index < sortedColumns.length - 1
                  ? sortedColumns[index + 1]
                  : null;
              const canMoveLeft = index > 0 && Boolean(leftNeighbor);
              const canMoveRight =
                index < sortedColumns.length - 1 && Boolean(rightNeighbor);
              const isStoryColumn = column.id === StoryColumnId;
              const canShiftLeft =
                !isStoryColumn &&
                canMoveLeft &&
                leftNeighbor?.id !== StoryColumnId;
              const canShiftRight =
                !isStoryColumn &&
                canMoveRight &&
                rightNeighbor?.id !== StoryColumnId;
              const isClosedWorkflowColumn =
                column.id === state.board.closedColumnId;
              return (
                <Column
                  key={column.id}
                  userRole={effectiveProjectRole}
                  column={column}
                  // sort tasks within column by priority, due date, title
                  tasks={state.board.tasks
                    .filter((t) => t.columnId === column.id)
                    .sort((a: Task, b: Task) => {
                      // Mapping priorities to numbers makes them easily sortable
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
                  isDraggable={canManageTasks}
                  onDropTask={async (taskId, colId) => {
                    // Prevent dropping tasks if they violate WIP limits or invalid workflow sequences
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

                    handleDropTask(
                      state,
                      dispatch,
                      taskId,
                      colId,
                      setShortError,
                    );

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
                    const task = state.board.tasks.find(
                      (item) => item.id === taskId,
                    );
                    if (task?.columnId === state.board.closedColumnId) {
                      setShortError('Closed tasks are read-only');
                      return;
                    }
                    setEditingTaskId(taskId);
                  }}
                  canManageTasks={canManageTasks}
                  onCreateTask={(columnId) => {
                    setCreateColumnId(columnId);
                  }}
                  canManageColumns={canManageColumns && layoutEditMode}
                  onRenameColumn={(columnId) =>
                    openRenameColumn(columnId, column.name)
                  }
                  canMoveLeft={canShiftLeft}
                  canMoveRight={canShiftRight}
                  onMoveLeft={(columnId) => handleMoveColumn(columnId, 'left')}
                  onMoveRight={(columnId) =>
                    handleMoveColumn(columnId, 'right')
                  }
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
                    if (col?.id === StoryColumnId) {
                      setShortError('Stories column cannot be deleted.');
                      return;
                    }
                    if (col)
                      setDeleteColumnDialog({
                        columnId,
                        columnName: col.name,
                      });
                  }}
                  canDeleteColumn={column.id !== StoryColumnId}
                  isClosedWorkflowColumn={isClosedWorkflowColumn}
                />
              );
            })(),
          )}
          {canManageColumns && layoutEditMode && (
            <button
              type="button"
              className={styles.addColumnButton}
              onClick={() => setAddColumnOpen(true)}
            >
              + Add Column
            </button>
          )}
        </div>
      </div>

      {shortError && (
        <div className={styles['shortError-bottom-right']}>{shortError}</div>
      )}

      <BoardModals
        addColumnOpen={addColumnOpen}
        setAddColumnOpen={setAddColumnOpen}
        workflowDialogOpen={workflowDialogOpen}
        setWorkflowDialogOpen={setWorkflowDialogOpen}
        deleteColumnDialog={deleteColumnDialog}
        setDeleteColumnDialog={setDeleteColumnDialog}
        wipDialog={wipDialog}
        setWipDialog={setWipDialog}
        renameColumnDialog={renameColumnDialog}
        setRenameColumnDialog={setRenameColumnDialog}
        selectedTaskId={selectedTaskId}
        setSelectedTaskId={setSelectedTaskId}
        createColumnId={createColumnId}
        setCreateColumnId={setCreateColumnId}
        editingTaskId={editingTaskId}
        setEditingTaskId={setEditingTaskId}
        handleSubmitAddColumn={handleSubmitAddColumn}
        handleSubmitWorkflow={handleSubmitWorkflow}
        handleSubmitDeleteColumn={handleSubmitDeleteColumn}
        handleSubmitWip={handleSubmitWip}
        handleRenameColumn={handleRenameColumn}
        setShortError={setShortError}
        sortedColumns={sortedColumns}
        state={state}
        dispatch={dispatch}
        user={user}
        effectiveProjectRole={effectiveProjectRole}
        mentionableProjectMembers={mentionableProjectMembers}
        assignableMembers={assignableMembers}
        StoryColumnId={StoryColumnId}
        canManageColumns={canManageColumns}
        layoutEditMode={layoutEditMode}
        dispatchBoardUpdate={dispatchBoardUpdate}
        onEditComment={onEditComment}
        onAddComment={onAddComment}
        onDeleteComment={onDeleteComment}
        onCreateTask={onCreateTask}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    </div>
  );
};

export default Board;
