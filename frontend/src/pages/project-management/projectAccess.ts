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
  avatarUrl: user.avatarUrl,
});

interface ApiDirectoryUser {
  id: string;
  name: string;
  email: string;
  globalRole: 'GLOBAL_ADMIN' | 'USER';
  avatarUrl?: string | null;
}

export const getProjectDirectoryUsers = async (): Promise<DirectoryUser[]> => {
  const users = (await apiClient('/users')) as ApiDirectoryUser[];
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    globalRole: user.globalRole,
    avatarUrl: user.avatarUrl,
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
    avatarUrl?: string | null;
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
  members: ProjectMemberSummary[];
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
    avatarUrl: member.avatarUrl,
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
  members,
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

  const currentMembersById = new Map(
    project.members.map((member) => [member.id, member]),
  );
  const nextMembersById = new Map(members.map((member) => [member.id, member]));

  const removedMembers = project.members.filter(
    (member) => !nextMembersById.has(member.id),
  );
  const addedMembers = members.filter(
    (member) => !currentMembersById.has(member.id),
  );
  const updatedMembers = members.filter((member) => {
    const currentMember = currentMembersById.get(member.id);
    return Boolean(currentMember && currentMember.role !== member.role);
  });

  await Promise.all(
    addedMembers.map((member) =>
      apiClient(`/projects/${project.id}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: member.email,
          role: member.role,
        }),
      }),
    ),
  );

  await Promise.all(
    updatedMembers.map((member) =>
      apiClient(`/projects/${project.id}/members/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify({ role: member.role }),
      }),
    ),
  );

  await Promise.all(
    removedMembers.map((member) =>
      apiClient(`/projects/${project.id}/members/${member.id}`, {
        method: 'DELETE',
      }),
    ),
  );

  const refreshedProject = await fetchManagedProjectById(project.id);
  if (refreshedProject) {
    return refreshedProject;
  }

  return {
    ...project,
    name: trimmedName,
    description: description.trim() || null,
    isArchived,
    members,
  };
};

export const removeManagedProjectMember = async ({
  project,
  memberId,
}: {
  project: ManagedProject;
  memberId: string;
}): Promise<ManagedProject> => {
  await apiClient(`/projects/${project.id}/members/${memberId}`, {
    method: 'DELETE',
  });

  const refreshedProject = await fetchManagedProjectById(project.id);
  if (refreshedProject) {
    return refreshedProject;
  }

  return {
    ...project,
    members: project.members.filter((member) => member.id !== memberId),
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
