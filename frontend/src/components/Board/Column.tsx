import type { BoardColumn, Task } from '../../types/Board';
import TaskCard from '../Task/TaskCard';
import styles from './Column.module.css';

interface Props {
  column: BoardColumn;
  tasks: Task[];
  onDropTask: (taskId: string, columnId: string) => void;
  onTaskClick?: (taskId: string) => void;
}

const Column = ({ column, tasks, onDropTask, onTaskClick }: Props) => {
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
        {column.title}
        <div className={styles['wip-limit']}>
          {column.wipLimit && ` (${tasks.length}/${column.wipLimit})`}
        </div>
      </h3>

      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
        />
      ))}
    </div>
  );
};

export default Column;
