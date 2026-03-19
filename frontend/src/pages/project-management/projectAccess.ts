import type {
  AuthUser,
  ProjectRole,
  DirectoryUser,
  ManagedProject,
  ProjectMemberSummary,
} from '../../types/Types';
import { apiClient } from '../../utils/api';

export const getDirectoryUser = (user: AuthUser): DirectoryUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  globalRole: user.globalRole,
});

interface ApiDirectoryUser {
  id: string;
  name: string;
  email: string;
  globalRole: 'GLOBAL_ADMIN' | 'USER';
}

export const getProjectDirectoryUsers = async (): Promise<DirectoryUser[]> => {
  const users = (await apiClient('/users')) as ApiDirectoryUser[];
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    globalRole: user.globalRole,
  }));
};

export const getGlobalAdminEmails = (
  directoryUsers: DirectoryUser[],
): Set<string> =>
  new Set(
    directoryUsers
      .filter((directoryUser) => directoryUser.globalRole === 'GLOBAL_ADMIN')
      .map((directoryUser) => directoryUser.email),
  );

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
    body: JSON.stringify({
      isArchived,
      name: trimmedName,
      description: description.trim() || null,
    }),
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
