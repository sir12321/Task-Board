import React from 'react';
import AddColumn from './AddColumn';
import DeleteColumn from './DeleteColumn';
import EditWIPColumn from './EditWIPColumn';
import HandleRenameColumn from './RenameColumn';
import WorkflowEditor from './WorkflowEditor';
import TaskDetailsModal from '../Task/TaskDetailsModal/TaskDetailsModal';
import TaskCreateEditModal from '../Task/TaskCreate/TaskCreateEdit';
import type { Board as BoardType, BoardWorkflow, NewTaskInput, ProjectMemberSummary, Task, ProjectRole } from '../../../types/Types';
import { isClosedColumn, isResolvedColumn } from './workflow';

interface BoardModalsProps {
  // Modal visibility states
  addColumnOpen: boolean;
  setAddColumnOpen: (open: boolean) => void;
  workflowDialogOpen: boolean;
  setWorkflowDialogOpen: (open: boolean) => void;
  deleteColumnDialog: { columnId: string; columnName: string } | null;
  setDeleteColumnDialog: (dialog: { columnId: string; columnName: string } | null) => void;
  wipDialog: { columnId: string; currentWip: number | null; columnTaskCount: number } | null;
  setWipDialog: (dialog: { columnId: string; currentWip: number | null; columnTaskCount: number } | null) => void;
  renameColumnDialog: { columnId: string; currentName: string } | null;
  setRenameColumnDialog: (dialog: { columnId: string; currentName: string } | null) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  createColumnId: string | null;
  setCreateColumnId: (id: string | null) => void;
  editingTaskId: string | null;
  setEditingTaskId: (id: string | null) => void;

  // Handlers and data
  handleSubmitAddColumn: (name: string) => Promise<void>;
  handleSubmitWorkflow: (workflow: BoardWorkflow) => Promise<void>;
  handleSubmitDeleteColumn: (columnId: string) => Promise<void>;
  handleSubmitWip: (columnId: string, wipLimit: number | null) => Promise<void>;
  handleRenameColumn: (columnId: string, name: string) => Promise<void>;
  setShortError: (err: string | null) => void;
  sortedColumns: any[];
  state: any;
  dispatch: any;
  user: any;
  effectiveProjectRole: ProjectRole;
  mentionableProjectMembers: ProjectMemberSummary[];
  assignableMembers: ProjectMemberSummary[];
  StoryColumnId: string;
  canManageColumns: boolean;
  layoutEditMode: boolean;
  dispatchBoardUpdate: (nextBoard: BoardType) => void;

  // Prop callbacks
  onEditComment?: (commentId: string, content: string) => Promise<void> | void;
  onAddComment?: (taskId: string, content: string) => Promise<void> | void;
  onDeleteComment?: (commentId: string) => Promise<void> | void;
  onCreateTask?: (payload: NewTaskInput) => Promise<void> | void;
  onUpdateTask?: (taskId: string, payload: NewTaskInput) => Promise<void> | void;
  onDeleteTask?: (taskId: string) => Promise<void> | void;
}

const BoardModals: React.FC<BoardModalsProps> = ({
  addColumnOpen, setAddColumnOpen,
  workflowDialogOpen, setWorkflowDialogOpen,
  deleteColumnDialog, setDeleteColumnDialog,
  wipDialog, setWipDialog,
  renameColumnDialog, setRenameColumnDialog,
  selectedTaskId, setSelectedTaskId,
  createColumnId, setCreateColumnId,
  editingTaskId, setEditingTaskId,
  handleSubmitAddColumn, handleSubmitWorkflow,
  handleSubmitDeleteColumn, handleSubmitWip,
  handleRenameColumn, setShortError,
  sortedColumns, state, dispatch, user,
  effectiveProjectRole, mentionableProjectMembers, assignableMembers,
  StoryColumnId, canManageColumns, layoutEditMode, dispatchBoardUpdate,
  onEditComment, onAddComment, onDeleteComment,
  onCreateTask, onUpdateTask, onDeleteTask
}) => {
  return (
    <>
      {addColumnOpen && (
        <AddColumn
          onSubmit={handleSubmitAddColumn}
          onCancel={() => setAddColumnOpen(false)}
          setShortError={setShortError}
        />
      )}

      {workflowDialogOpen && (
        <WorkflowEditor
          title="Edit board workflow"
          description="Map workflow headings to columns. Visual column order stays separate from this workflow mapping."
          columns={sortedColumns}
          workflow={{
            storyColumnId: state.board.storyColumnId,
            workflowColumnIds: state.board.workflowColumnIds,
            resolvedColumnId: state.board.resolvedColumnId,
            closedColumnId: state.board.closedColumnId,
          }}
          onSubmit={handleSubmitWorkflow}
          onCancel={() => setWorkflowDialogOpen(false)}
          setShortError={setShortError}
        />
      )}

      {deleteColumnDialog && (
        <DeleteColumn
          columnId={deleteColumnDialog.columnId}
          columnName={deleteColumnDialog.columnName}
          onSubmit={handleSubmitDeleteColumn}
          onCancel={() => setDeleteColumnDialog(null)}
          setShortError={setShortError}
        />
      )}

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

      {canManageColumns && renameColumnDialog && (
        <HandleRenameColumn
          columnId={renameColumnDialog.columnId}
          currentName={renameColumnDialog.currentName}
          canManageColumns={canManageColumns && layoutEditMode}
          onSubmit={handleRenameColumn}
          onCancel={() => setRenameColumnDialog(null)}
          setShortError={setShortError}
        />
      )}

      {selectedTaskId && (
        <TaskDetailsModal
          task={state.board.tasks.find((t: Task) => t.id === selectedTaskId)!}
          userRole={effectiveProjectRole}
          projectMembers={state.projectDetails.members}
          mentionableMembers={mentionableProjectMembers}
          currentUserId={user?.id}
          currentUserGlobalRole={user?.globalRole}
          onClose={() => setSelectedTaskId(null)}
          onEditComment={async (commentId: string, content: string) => {
            if (onEditComment) {
              await onEditComment(commentId, content);
              return;
            }
            const now = new Date().toISOString();
            dispatch({
              type: 'SET_BOARD',
              payload: {
                board: {
                  ...state.board,
                  tasks: state.board.tasks.map((task: Task) =>
                    task.id === selectedTaskId
                      ? {
                          ...task,
                          comments: task.comments?.map((comment) =>
                            comment.id === commentId
                              ? { ...comment, content, updatedAt: now }
                              : comment,
                          ),
                        }
                      : task,
                  ),
                },
              },
            });
          }}
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
                  tasks: state.board.tasks.map((task: Task) =>
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
          onDeleteComment={async (commentId: string) => {
            if (onDeleteComment) {
              await onDeleteComment(commentId);
              return;
            }
            dispatch({
              type: 'SET_BOARD',
              payload: {
                board: {
                  ...state.board,
                  tasks: state.board.tasks.map((task: Task) =>
                    task.id === selectedTaskId
                      ? {
                          ...task,
                          comments: task.comments?.filter((c) => c.id !== commentId),
                        }
                      : task,
                  ),
                },
              },
            });
          }}
        />
      )}

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
            const column = state.board.columns.find((c: any) => c.id === payload.columnId);
            const now = new Date().toISOString();
            const draftBoard = {
              ...state.board,
              tasks: [
                {
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
                  status: column?.name ?? 'Unknown',
                  reporterId: 'current-user',
                  reporterName: 'Current User',
                  assigneeId: payload.assigneeId ?? null,
                  assigneeName: assignableMembers.find((m) => m.id === payload.assigneeId)?.name ?? null,
                  parentId: payload.parentId ?? null,
                  resolvedAt: isResolvedColumn(state.board, payload.columnId) ? now : null,
                  closedAt: isClosedColumn(state.board, payload.columnId) ? now : null,
                },
                ...state.board.tasks,
              ],
            };
            dispatchBoardUpdate(draftBoard);
          }}
        />
      )}

      {editingTaskId && (
        <TaskCreateEditModal
          mode="edit"
          task={state.board.tasks.find((t: Task) => t.id === editingTaskId)}
          defaultStoryColumnId={StoryColumnId}
          closedColumnId={state.board.closedColumnId}
          defaultColumnId={
            state.board.tasks.find((t: Task) => t.id === editingTaskId)?.columnId ?? 'col-backlog'
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
            if (onDeleteTask) {
              try {
                await onDeleteTask(taskId);
              } catch {
                setShortError('Failed to delete task');
              }
            } else {
              dispatch({ type: 'DELETE_TASK', payload: { taskId } });
            }
            setSelectedTaskId(null);
          }}
        />
      )}
    </>
  );
};

export default BoardModals;
