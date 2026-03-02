export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: TaskPriority;
  assigneeIds: string[];
  reporterId: string;
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