import type { Task } from '../../types/Board';
import './TaskCard.css';

interface Props {
  task: Task;
  onClick?: () => void;
}

const TaskCard = ({ task, onClick }: Props) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const assignees = task.assigneeIds ?? [];
  const avatarInitials = (id: string) => id.slice(0, 2).toUpperCase();

  return (
    <div
      className="task-card"
      draggable
      onClick={onClick}
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', task.id);
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <h4>{task.title}</h4>
      <p className="meta">
        <span className="priority">{task.priority}</span>
        {task.dueDate && (
          <span className="due-date">Due {formatDate(task.dueDate)}</span>
        )}
      </p>

      {assignees.length > 0 && (
        <div className="assignees" aria-hidden={false}>
          {assignees.slice(0, 3).map((id) => (
            <div
              key={id}
              className="assignee"
              title={`Assignee: ${id}`}
              aria-label={`Assignee ${id}`}
            >
              {avatarInitials(id)}
            </div>
          ))}
          {assignees.length > 3 && (
            <div className="assignee overflow">+{assignees.length - 3}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
