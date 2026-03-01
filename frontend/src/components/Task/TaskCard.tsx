import "./task.css";

interface TaskCardProps {
  title: string;
}

function TaskCard({ title }: TaskCardProps) {
  return (
    <div className="task-card">
      <p>{title}</p>
    </div>
  );
}

export default TaskCard;