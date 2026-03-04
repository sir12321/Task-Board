export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TaskType = "STORY" | "TASK" | "BUG";

export type GlobalRole = "GLOBAL_ADMIN" | "USER";

export type ProjectRole = "PROJECT_ADMIN" | "PROJECT_MEMBER" | "PROJECT_VIEWER";

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  taskId: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  type: TaskType;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  columnId: string;
  columnName: string;
  reporterId: string;
  assigneeId?: string | null;
  parentId?: string | null;
  comments?: Comment[];
}