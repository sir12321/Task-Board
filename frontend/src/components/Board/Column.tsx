import TaskCard from "../Task/TaskCard";
import "./column.css";

interface ColumnProps {
  title: string;
  tasks: { id: string; title: string }[];
}

function Column({ title, tasks }: ColumnProps) {
  return (
    <div className="column">
      <h3>{title}</h3>
      {tasks.map((task) => (
        <TaskCard key={task.id} title={task.title} />
      ))}
    </div>
  );
}

export default Column;