import Column from "./Column";
import "./board.css";

const mockColumns = [
  {
    id: "todo",
    title: "TO DO",
    tasks: [
      { id: "1", title: "User authentication flow" },
      { id: "2", title: "Setup database schema" },
    ],
  },
  {
    id: "inprogress",
    title: "IN PROGRESS",
    tasks: [
      { id: "3", title: "Design login page UI" },
      { id: "4", title: "Fix token refresh race condition" },
    ],
  },
  {
    id: "review",
    title: "REVIEW",
    tasks: [{ id: "5", title: "Setup CI/CD pipeline" }],
  },
  {
    id: "done",
    title: "DONE",
    tasks: [{ id: "6", title: "Write unit tests for auth service" }],
  },
];

function Board() {
  return (
    <div className="board">
      {mockColumns.map((col) => (
        <Column key={col.id} title={col.title} tasks={col.tasks} />
      ))}
    </div>
  );
}

export default Board;