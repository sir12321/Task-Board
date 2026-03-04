import type { BoardColumn, Task } from '../../types/Types';
import TaskCard from '../Task/TaskCard';
import styles from './Column.module.css';

interface Properties {
  column: BoardColumn;
  tasks: Task[];
  onDropTask: (taskId: string, columnId: string) => void;
  onTaskClick?: (taskId: string) => void;
  isDraggable?: boolean;
}

const Column = ({
  column,
  tasks,
  onDropTask,
  onTaskClick,
  isDraggable,
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

      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
          isDraggable={Boolean(isDraggable && column.id !== 'col-story')}
        />
      ))}
    </div>
  );
};

export default Column;
