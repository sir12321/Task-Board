import { useState } from 'react';
import type {
  Task as Task,
  ProjectRole as ProjectRole,
} from '../../../../types/Types';
import styles from './TaskCard.module.css';
import { getInitials } from '../../../../utils/getInitials';

interface Properties {
  task: Task;
  onClick?: () => void;
  isDraggable?: boolean;
  onEdit?: () => void;
  projectRole: ProjectRole;
}

const TaskCard = ({
  task,
  onClick,
  isDraggable = true,
  onEdit,
  projectRole,
}: Properties) => {
  const [isDragging, setIsDragging] = useState(false);
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    // Use UTC methods to avoid timezone shifting
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };
  if (task.type === 'STORY') {
    isDraggable = false;
  }
  const assignee = task.assigneeName || null;
  const taskType = task.type.toLowerCase();

  return (
    <div
      className={`${styles.taskCard} ${styles[taskType]} ${!isDraggable ? styles.notDraggable : ''} ${isDragging ? styles.isDragging : ''}`}
      draggable={isDraggable}
      onClick={onClick}
      onDragStart={(e) => {
        if (!isDraggable) return;
        setTimeout(() => setIsDragging(true), 0);
        e.dataTransfer.setData('taskId', task.id);
      }}
      onDragEnd={() => {
        setIsDragging(false);
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Open task ${task.title}`}
      onKeyDown={(event) => {
        if (!onClick) {
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <h4>{task.title}</h4>
      {projectRole !== 'PROJECT_VIEWER' && onEdit && (
        <button
          type="button"
          className={styles.editTaskBtn}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label={`Edit task ${task.title}`}
        >
          Edit
        </button>
      )}

      <p className={styles.meta}>
        <span className={`${styles.priority} ${styles[taskType]}`}>
          {' '}
          {task.type}
        </span>
        {task.dueDate && (
          <span className={styles.dueDate}>Due {formatDate(task.dueDate)}</span>
        )}
      </p>

      {assignee && (
        <div className={styles.assignees}>
          <div className={styles.assignee} title={`Assignee: ${assignee}`}>
            {task.assigneeAvatarUrl ? (
              <img src={task.assigneeAvatarUrl} alt={assignee} />
            ) : (
              getInitials(assignee)
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
