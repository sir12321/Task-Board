import type {
  AuthUser,
  Project,
  ProjectDetails,
  ProjectMemberSummary,
  ProjectRole,
} from '../../types/Types';

export interface ManagedProject extends Project {
  members: ProjectMemberSummary[];
  boards: {
    id: string;
    name: string;
  }[];
  isArchived?: boolean;
}

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  globalRole?: 'GLOBAL_ADMIN' | 'USER';
}

export const PROJECT_ROLE_OPTIONS: Array<{
  value: ProjectRole;
  label: string;
}> = [
  { value: 'PROJECT_ADMIN', label: 'Admin' },
  { value: 'PROJECT_MEMBER', label: 'User' },
  { value: 'PROJECT_VIEWER', label: 'Viewer' },
];

export const INITIAL_DIRECTORY: DirectoryUser[] = [
  {
    id: 'user-admin',
    name: 'Global Admin',
    email: 'admin@taskboard.com',
    globalRole: 'GLOBAL_ADMIN',
  },
  {
    id: 'user-manya',
    name: 'Manya Jain',
    email: 'manya@iitd.ac.in',
    globalRole: 'USER',
  },
  {
    id: 'user-john',
    name: 'John Doe',
    email: 'john@iitd.ac.in',
    globalRole: 'USER',
  },
  {
    id: 'user-alice',
    name: 'Alice Smith',
    email: 'alice@iitd.ac.in',
    globalRole: 'USER',
  },
];

const STORAGE_KEY = 'taskboard-managed-projects';

const seedProjects: ManagedProject[] = [
  {
    id: 'project-demo',
    name: 'Demo Project',
    description: 'A demo project for TaskFlow',
    isArchived: false,
    boards: [
      {
        id: 'board-demo',
        name: 'Demo Board',
      },
    ],
    members: [
      {
        id: 'user-admin',
        name: 'Global Admin',
        email: 'admin@taskboard.com',
        role: 'PROJECT_ADMIN',
      },
      {
        id: 'user-manya',
        name: 'Manya Jain',
        email: 'manya@iitd.ac.in',
        role: 'PROJECT_ADMIN',
      },
      {
        id: 'user-john',
        name: 'John Doe',
        email: 'john@iitd.ac.in',
        role: 'PROJECT_MEMBER',
      },
      {
        id: 'user-alice',
        name: 'Alice Smith',
        email: 'alice@iitd.ac.in',
        role: 'PROJECT_VIEWER',
      },
    ],
  },
];

export const loadManagedProjects = (): ManagedProject[] => {
  if (typeof window === 'undefined') {
    return seedProjects;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedProjects));
    return seedProjects;
  }

  try {
    const parsed = JSON.parse(raw) as ManagedProject[];
    return parsed.length > 0 ? parsed : seedProjects;
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedProjects));
    return seedProjects;
  }
};

export const saveManagedProjects = (projects: ManagedProject[]): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

export const getDirectoryUser = (user: AuthUser): DirectoryUser => ({
  id: `auth-${user.id}`,
  name: user.name,
  email: user.email,
  globalRole: user.globalRole,
});

export const buildProjectDetailsForUser = (
  project: ManagedProject,
  user: AuthUser,
): ProjectDetails | null => {
  const membership = project.members.find((member) => member.email === user.email);

  if (!membership && user.globalRole !== 'GLOBAL_ADMIN') {
    return null;
  }

  return {
    ...project,
    members: project.members.filter((member) => member.email !== 'admin@taskboard.com'),
    userRole: membership?.role ?? 'PROJECT_ADMIN',
  };
};
