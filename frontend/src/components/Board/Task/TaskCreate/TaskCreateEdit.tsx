import { useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import type {
  BoardColumn,
  ProjectMemberSummary,
  Task,
  NewTaskInput,
} from '../../../../types/Types';
import styles from './TaskCreateEdit.module.css';

interface Props {
  mode: 'create' | 'edit';
  task?: Task;
  defaultStoryColumnId: string;
  defaultColumnId: string;
  columns: BoardColumn[];
  tasks: Task[];
  assignableMembers: ProjectMemberSummary[];
  onClose: () => void;
  onSave: (values: NewTaskInput) => Promise<void> | void;
  onDelete?: (taskId: string) => Promise<void> | void;
}

const toDateInput = (dateValue: string | null): string => {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  // Extract date in UTC to avoid timezone shifting
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TaskCreateEditModal = ({
  mode,
  task,
  defaultStoryColumnId,
  defaultColumnId,
  columns,
  tasks,
  assignableMembers,
  onClose,
  onSave,
  onDelete,
}: Props) => {
  const initialColumnId = task?.columnId ?? defaultColumnId;
  const initialType =
    task?.type ?? (initialColumnId === defaultStoryColumnId ? 'STORY' : 'TASK');
  const [title, setTitle] = useState(task?.title ?? 'Issue');
  const [description, setDescription] = useState(
    task?.description ?? 'Description',
  );
  const [type, setType] = useState<NewTaskInput['type']>(initialType);
  const [priority, setPriority] = useState<NewTaskInput['priority']>(
    task?.priority ?? 'MEDIUM',
  );
  const [dueDate, setDueDate] = useState(toDateInput(task?.dueDate ?? null));
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '');
  const [parentId, setParentId] = useState(task?.parentId ?? '');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const columnName = useMemo(
    () => columns.find((c) => c.id === initialColumnId)?.name ?? 'Unknown',
    [columns, initialColumnId],
  );

  const candidateParents = useMemo(
    () =>
      tasks.filter(
        (candidate) => candidate.id !== task?.id && candidate.type === 'STORY',
      ),
    [task?.id, tasks],
  );

  const submit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    if (initialColumnId === defaultStoryColumnId && type !== 'STORY') {
      setError('Only STORY tasks are allowed in the Stories column.');
      return;
    }

    if (initialColumnId !== defaultStoryColumnId && type === 'STORY') {
      setError('STORY tasks can only be created in the Stories column.');
      return;
    }

    if (dueDate) {
      const today = new Date().toISOString().slice(0, 10);
      if (dueDate < today) {
        setError('Due date cannot be in the past.');
        return;
      }
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        type,
        priority,
        dueDate: dueDate
          ? new Date(`${dueDate}T12:00:00.000Z`).toISOString()
          : null,
        columnId: initialColumnId,
        assigneeId: assigneeId.trim() || null,
        parentId: parentId || null,
      });
      onClose();
    } catch {
      setError('Failed to save task.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!onDelete || !task) {
      return;
    }

    setError(null);
    setDeleting(true);
    try {
      await onDelete(task.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (deleteError) {
      console.error('Failed to delete task:', deleteError);
      setError('Failed to delete task.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.overall} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>

        <h2 className={styles.title}>
          {mode === 'create' ? 'Create Task' : 'Edit Task'}
        </h2>
        <p className={styles.subtitle}>Column: {columnName}</p>

        <form className={styles.form} onSubmit={submit}>
          {/*Title*/}
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
            />
          </label>

          {/*Description*/}
          <label>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task"
              rows={4}
            />
          </label>

          <div className={styles.grid2}>
            {/*Type*/}
            <label>
              Type
              <select
                value={type}
                onChange={
                  (e) => setType(e.target.value as NewTaskInput['type']) // to narrow down the possibility of type
                }
              >
                {defaultStoryColumnId !== initialColumnId && (
                  <option value="TASK">TASK</option>
                )}
                {defaultStoryColumnId !== initialColumnId && (
                  <option value="BUG">BUG</option>
                )}
                {defaultStoryColumnId === initialColumnId && (
                  <option value="STORY">STORY</option>
                )}
              </select>
            </label>

            {/*Priority*/}
            <label>
              Priority
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as NewTaskInput['priority'])
                }
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </label>
          </div>

          <div className={styles.grid2}>
            {/*Due Date*/}
            <label>
              Due Date
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </label>

            {/*Assignee*/}
            <label>
              Assignee ID
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {assignableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/*Parent*/}
          <label>
            Parent
            <select
              value={parentId}
              onChange={(e) => {
                setParentId(e.target.value);
              }}
            >
              <option value="">None</option>
              {candidateParents.map((parentTask) => (
                <option key={parentTask.id} value={parentTask.id}>
                  {parentTask.title}
                </option>
              ))}
            </select>
          </label>

          {error && <div className={styles.error}>{error}</div>}

          {/*Submit Button*/}
          <div className={styles.actions}>
            {mode === 'edit' && onDelete && task && (
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting}
              >
                Delete task
              </button>
            )}
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {' '}
              {/* Disable submit while saving to prevent duplicate requests*/}
              {saving
                ? 'Saving...'
                : mode === 'create'
                  ? 'Create task'
                  : 'Save changes'}
            </button>
          </div>
        </form>

        {showDeleteConfirm && (
          <div
            className={styles.deleteConfirmOverlay}
            onClick={() => {
              if (!deleting) {
                setShowDeleteConfirm(false);
              }
            }}
          >
            <div
              className={styles.deleteConfirmDialog}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={styles.deleteConfirmTitle}>Delete this task?</h3>
              <p className={styles.deleteConfirmText}>
                This action cannot be undone.
              </p>
              <div className={styles.deleteConfirmActions}>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.deleteConfirmButton}
                  onClick={() => {
                    void handleDeleteTask();
                  }}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCreateEditModal;
