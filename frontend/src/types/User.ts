export type GlobalRole = "ADMIN" | "USER";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;

  role: GlobalRole;

  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}