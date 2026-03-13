import type {
  AuthUser,
  ProjectDetails,
  ProjectRole,
  DirectoryUser,
  ManagedProject,
  ProjectMemberSummary,
} from '../../types/Types';
import { apiClient } from '../../utils/api';
// to be replaced in future to backend API call
import { INITIAL_DIRECTORY, seedProjects } from './ProjectAccessMock';

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

export const getProjectDirectoryUsers = (): DirectoryUser[] =>
  INITIAL_DIRECTORY;

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

interface ApiProjectSummary {
  id: string;
  name: string;
  description: string | null;
  isArchived?: boolean;
  members: {
    id: string;
    name: string;
    email: string;
    role: string;
  }[];
  boards: { id: string; name: string }[];
}

interface CreateManagedProjectInput {
  name: string;
  description: string;
  members: ProjectMemberSummary[];
  creatorEmail: string;
}

interface SaveManagedProjectSettingsInput {
  project: ManagedProject;
  name: string;
  description: string;
  isArchived: boolean;
}

interface AddManagedProjectMemberInput {
  project: ManagedProject;
  member: DirectoryUser;
  role: ProjectRole;
}

interface UpdateManagedProjectMemberRoleInput {
  project: ManagedProject;
  memberId: string;
  role: ProjectRole;
}

const mapApiProjectToManagedProject = (
  project: ApiProjectSummary,
): ManagedProject => ({
  id: project.id,
  name: project.name,
  description: project.description,
  boards: project.boards,
  isArchived: project.isArchived ?? false,
  members: project.members.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role as ProjectRole,
  })),
});

const fetchManagedProjectById = async (
  projectId: string,
): Promise<ManagedProject | null> => {
  const projects = (await apiClient('/projects')) as ApiProjectSummary[];
  const project = projects.find(
    (currentProject) => currentProject.id === projectId,
  );
  return project ? mapApiProjectToManagedProject(project) : null;
};

export const createManagedProject = async ({
  name,
  description,
  members,
  creatorEmail,
}: CreateManagedProjectInput): Promise<ManagedProject> => {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error('Project name is required');
  }

  const createdProject = await apiClient('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: trimmedName,
      description: description.trim() || undefined,
    }),
  });

  const projectId = String(createdProject.id);
  const additionalMembers = members.filter(
    (member) => member.email !== creatorEmail,
  );

  await Promise.all(
    additionalMembers.map((member) =>
      apiClient(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: member.email,
          role: member.role,
        }),
      }),
    ),
  );

  const projects = (await apiClient('/projects')) as ApiProjectSummary[];
  const createdProjectDetails = projects.find(
    (project) => project.id === projectId,
  );

  if (!createdProjectDetails) {
    throw new Error('Project was created, but could not be reloaded');
  }

  return mapApiProjectToManagedProject(createdProjectDetails);
};

export const saveManagedProjectSettings = async ({
  project,
  name,
  description,
  isArchived,
}: SaveManagedProjectSettingsInput): Promise<ManagedProject> => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Project name cannot be empty.');
  }

  await apiClient(`/projects/${project.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isArchived }),
  });

  return {
    ...project,
    name: trimmedName,
    description: description.trim() || null,
    isArchived,
  };
};

export const addManagedProjectMember = async ({
  project,
  member,
  role,
}: AddManagedProjectMemberInput): Promise<ManagedProject> => {
  await apiClient(`/projects/${project.id}/members`, {
    method: 'POST',
    body: JSON.stringify({
      email: member.email,
      role,
    }),
  });

  const refreshedProject = await fetchManagedProjectById(project.id);
  if (refreshedProject) {
    return refreshedProject;
  }

  return {
    ...project,
    members: [
      ...project.members,
      {
        id: member.id,
        name: member.name,
        email: member.email,
        role,
      },
    ],
  };
};

export const updateManagedProjectMemberRole = async ({
  project,
  memberId,
  role,
}: UpdateManagedProjectMemberRoleInput): Promise<ManagedProject> => {
  await apiClient(`/projects/${project.id}/members/${memberId}`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });

  const refreshedProject = await fetchManagedProjectById(project.id);
  if (refreshedProject) {
    return refreshedProject;
  }

  return {
    ...project,
    members: project.members.map((member) =>
      member.id === memberId ? { ...member, role } : member,
    ),
  };
};
