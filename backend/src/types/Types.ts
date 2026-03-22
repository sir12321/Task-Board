export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskType = 'STORY' | 'TASK' | 'BUG';

export type GlobalRole = 'GLOBAL_ADMIN' | 'USER';

export type ProjectRole = 'PROJECT_ADMIN' | 'PROJECT_MEMBER' | 'PROJECT_VIEWER';

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string;
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
  status: string;
  reporterId: string;
  reporterName: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  parentId?: string | null;
  parentName?: string | null;

  comments?: Comment[];
  auditLogs?: AuditLog[];
}

export interface NewTaskInput {
  title: string;
  description?: string | null;
  type: TaskType;
  priority: TaskPriority;
  dueDate: string | null;
  columnId: string;
  assigneeId?: string | null;
  parentId?: string | null;
}

export interface BoardColumn {
  id: string;
  name: string;
  boardId: string;
  order: number;
  wipLimit: number | null;
}

export interface BoardWorkflow {
  storyColumnId: string | null;
  workflowColumnIds: string[];
  resolvedColumnId: string | null;
  closedColumnId: string | null;
}

export interface Board extends BoardWorkflow {
  id: string;
  name: string;
  projectId: string;
  columns: BoardColumn[];
  tasks: Task[];
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface User extends UserProfile {
  id: string;
  globalRole: GlobalRole;
  notifications: Notification[];
  projects: ProjectMember[];
}

export interface Notification {
  id: string;
  userId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface ProjectMember {
  projectId: string;
  role: ProjectRole;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
}

export interface ProjectDetails extends Project {
  userRole: ProjectRole;
  members: ProjectMemberSummary[];
  boards: {
    id: string;
    name: string;
  }[];
}

export interface ProjectMemberSummary {
  id: string;
  name: string;
  email: string;
  role: ProjectRole;
}

export interface AuditLog {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  timestamp: string;
  user?: {
    name: string;
    avatarUrl?: string | null;
  };
}
