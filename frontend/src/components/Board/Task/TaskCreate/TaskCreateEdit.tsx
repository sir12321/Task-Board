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
  defaultColumnId: string;
  columns: BoardColumn[];
  tasks: Task[];
  assignableMembers: ProjectMemberSummary[];
  onClose: () => void;
  onSave: (values: NewTaskInput) => Promise<void> | void;
}

const toDateInput = (dateValue: string | null): string => {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const TaskCreateEditModal = ({
  mode,
  task,
  defaultColumnId,
  columns,
  tasks,
  assignableMembers,
  onClose,
  onSave,
}: Props) => {
  const initialColumnId = task?.columnId ?? defaultColumnId;
  const initialType =
    task?.type ?? (initialColumnId === 'col-story' ? 'STORY' : 'TASK');
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

    if (initialColumnId === 'col-story' && type !== 'STORY') {
      setError('Only STORY tasks are allowed in the Stories column.');
      return;
    }

    if (initialColumnId !== 'col-story' && type === 'STORY') {
      setError('STORY tasks can only be created in the Stories column.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        type,
        priority,
        dueDate: dueDate
          ? new Date(`${dueDate}T00:00:00.000Z`).toISOString()
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

  return (
    <div className={styles.overlay} onClick={onClose}>
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
                onChange={(e) =>
                  setType(e.target.value as NewTaskInput['type'])
                }
              >
                <option value="TASK">TASK</option>
                <option value="BUG">BUG</option>
                <option value="STORY">STORY</option>
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
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">None</option>
              {candidateParents.map((parentTask) => (
                <option key={parentTask.id} value={parentTask.id}>
                  {parentTask.title} ({parentTask.id})
                </option>
              ))}
            </select>
          </label>

          {error && <div className={styles.error}>{error}</div>}

          {/*Submit Button*/}
          <div className={styles.actions}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving
                ? 'Saving...'
                : mode === 'create'
                  ? 'Create task'
                  : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskCreateEditModal;
