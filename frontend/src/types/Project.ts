export type ProjectRole = "PROJECT_ADMIN" | "MEMBER" | "VIEWER";

export interface Project {
  id: string;
  name: string;
  description?: string | null;

  role: ProjectRole; // current user's role in this project

  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetails extends Project {
  members: ProjectMemberSummary[];
  boards: {
    id: string;
    name: string;
  }[];
}

export interface ProjectMemberSummary {
  id: string;
  name: string;
  role: ProjectRole;
  avatarUrl?: string | null;
}