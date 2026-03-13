import type {
  AuthUser,
  ProjectDetails,
  ProjectRole,
  DirectoryUser,
  ManagedProject,
} from '../../types/Types';
// to be replaced in future to backend API call
import { seedProjects } from './ProjectAccessMock';

export const PROJECT_ROLE_OPTIONS: Array<{
  value: ProjectRole;
  label: string;
}> = [
  { value: 'PROJECT_ADMIN', label: 'Admin' },
  { value: 'PROJECT_MEMBER', label: 'User' },
  { value: 'PROJECT_VIEWER', label: 'Viewer' },
];

const STORAGE_KEY = 'taskboard-managed-projects';

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

// to be replaced in future to backend API call to fetch project details for a user
export const buildProjectDetailsForUser = (
  project: ManagedProject,
  user: AuthUser,
): ProjectDetails | null => {
  const members = project.members.find((member) => member.email === user.email);

  if (!members && user.globalRole !== 'GLOBAL_ADMIN') {
    return null;
  }

  return {
    ...project,
    members: project.members.filter(
      (member) => member.email !== 'admin@taskboard.com',
    ),
    userRole: members?.role ?? 'PROJECT_ADMIN',
  };
};
