import type { BoardColumn, Task } from '../../types/Types';
import TaskCard from '../Task/TaskCard';
import styles from './Column.module.css';

interface Properties {
  column: BoardColumn;
  tasks: Task[];
  onDropTask: (taskId: string, columnId: string) => void;
  onTaskClick?: (taskId: string) => void;
  onTaskEdit?: (taskId: string) => void;
  isDraggable?: boolean;
  canManageTasks?: boolean;
  onCreateTask?: (columnId: string) => void;
}

const Column = ({
  column,
  tasks,
  onDropTask,
  onTaskClick,
  onTaskEdit,
  isDraggable,
  canManageTasks,
  onCreateTask,
}: Properties) => {
  return (
    <div
      className={styles.column}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const taskId = e.dataTransfer.getData('taskId');
        onDropTask(taskId, column.id);
      }}
    >
      <h3>
        {column.name}
        <div className={styles['wip-limit']}>
          {column.wipLimit && ` (${tasks.length}/${column.wipLimit})`}
        </div>
      </h3>
      {canManageTasks && onCreateTask && (
        <button
          type="button"
          className={styles.createButton}
          onClick={() => onCreateTask(column.id)}
        >
          + Create task
        </button>
      )}

      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
          onEdit={onTaskEdit ? () => onTaskEdit(task.id) : undefined}
          isDraggable={Boolean(isDraggable && column.id !== 'col-story')}
        />
      ))}
    </div>
  );
};

export default Column;
