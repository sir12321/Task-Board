import type { Task } from '../../types/Types';
import './TaskCard.css';

interface Properties {
  task: Task;
  onClick?: () => void;
  isDraggable?: boolean;
}

const TaskCard = ({ task, onClick, isDraggable = true }: Properties) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const avatarInitials = (id: string) => id.slice(0, 2).toUpperCase();
  const Assignee = task.assigneeId || null;
  const taskTypeClass = task.type.toLowerCase();

  return (
    <div
      className={`task-card ${taskTypeClass} ${!isDraggable ? 'not-draggable' : ''}`}
      draggable={isDraggable}
      onClick={onClick}
      onDragStart={(e) => {
        if (!isDraggable) return;
        e.dataTransfer.setData('taskId', task.id);
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <h4>{task.title}</h4>
      <p className="meta">
        <span className={`priority ${taskTypeClass}`}>{task.type}</span>
        {task.dueDate && (
          <span className="due-date">Due {formatDate(task.dueDate)}</span>
        )}
      </p>

      {Assignee && (
        <div className="assignees" aria-hidden={false}>
          <div
            className="assignee"
            title={`Assignee: ${Assignee}`}
            aria-label={`Assignee ${Assignee}`}
          >
            {avatarInitials(Assignee)}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
