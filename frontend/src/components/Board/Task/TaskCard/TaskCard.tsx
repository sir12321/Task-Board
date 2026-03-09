import type {
  Task as Task,
  ProjectRole as ProjectRole,
} from '../../../../types/Types';
import styles from './TaskCard.module.css';

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
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const avatarInitials = (id: string) => id.slice(0, 2).toUpperCase();

  const assignee = task.assigneeId || null;

  // Normalize task type to use as a CSS class.
  const taskType = task.type.toLowerCase();

  return (
    <div
      className={`${styles.taskCard} ${styles[taskType]} ${!isDraggable ? styles.notDraggable : ''}`}
      draggable={isDraggable}
      onClick={onClick}
      // When dragging starts, place the task id on the dataTransfer so
      // drop targets can identify which task is being moved.
      onDragStart={(e) => {
        if (!isDraggable) return;
        e.dataTransfer.setData('taskId', task.id);
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <h4>{task.title}</h4>

      {/* Optional edit button; stopPropagation prevents the card click
          handler from also firing when editing. */}
      {projectRole !== 'PROJECT_VIEWER' && onEdit && (
        <button
          type="button"
          className={styles.editTaskBtn}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          Edit
        </button>
      )}

      <p className={styles.meta}>
        <span className={`${styles.priority} ${styles[taskType]}`}>
          {task.type}
        </span>
        {task.dueDate && (
          <span className={styles.dueDate}>Due {formatDate(task.dueDate)}</span>
        )}
      </p>

      {assignee && (
        <div className={styles.assignees}>
          <div
            className={styles.assignee}
            title={`Assignee: ${assignee}`}
            aria-label={`Assignee ${assignee}`}
          >
            {avatarInitials(assignee)}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
