export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TaskType = "STORY" | "TASK" | "BUG";

export interface Task {
  id: string;
  title: string;
  description? : string | null;
  type: TaskType;
  status: string;
  priority: TaskPriority;
  assigneeId: string;
  reporterId: string;
  parentId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardColumn {
  id: string;
  title: string;
  order: number;
  wipLimit: number | null;
}

export interface Board {
  id: string;
  name: string;
  columns: BoardColumn[];
  tasks: Task[];
}
