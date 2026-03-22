import { useEffect, useMemo, useState } from 'react';
import type {
  AuthUser,
  DirectoryUser,
  ProjectDetails,
  ProjectMemberSummary,
  ProjectRole,
} from '../../../types/Types';

export const useProjectManager = (
  user: AuthUser,
  adminProjects: ProjectDetails[],
  directoryUsers: DirectoryUser[],
  onSaveProjectSettings: (input: {
    projectId: string;
    name: string;
    description: string;
    isArchived: boolean;
    members: ProjectMemberSummary[];
  }) => Promise<void>,
  onDeleteProject: (input: { projectId: string }) => Promise<void>,
) => {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectQuery, setProjectQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [directoryRoles, setDirectoryRoles] = useState<
    Record<string, ProjectRole>
  >({});
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftArchived, setDraftArchived] = useState(false);
  const [draftMembers, setDraftMembers] = useState<ProjectMemberSummary[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredProjects = useMemo(() => {
    const query = projectQuery.trim().toLowerCase();
    if (!query) return adminProjects;
    return adminProjects.filter((project) =>
      project.name.toLowerCase().includes(query),
    );
  }, [adminProjects, projectQuery]);

  useEffect(() => {
    if (!selectedProjectId && filteredProjects.length > 0) {
      setSelectedProjectId(filteredProjects[0].id);
      return;
    }

    if (
      selectedProjectId &&
      !filteredProjects.some((project) => project.id === selectedProjectId)
    ) {
      setSelectedProjectId(filteredProjects[0]?.id ?? '');
    }
  }, [filteredProjects, selectedProjectId]);

  const selectedProject =
    filteredProjects.find((project) => project.id === selectedProjectId) ??
    adminProjects.find((project) => project.id === selectedProjectId) ??
    null;

  const availableUsers = useMemo(() => {
    if (!selectedProject) return [];
    const query = userQuery.trim().toLowerCase();
    const assignedEmails = new Set(draftMembers.map((member) => member.email));

    return directoryUsers.filter((person) => {
      if (person.globalRole === 'GLOBAL_ADMIN') return false;
      if (assignedEmails.has(person.email)) return false;
      if (!query) return true;
      return (
        person.name.toLowerCase().includes(query) ||
        person.email.toLowerCase().includes(query)
      );
    });
  }, [directoryUsers, draftMembers, selectedProject, userQuery]);

  const filteredMembers = useMemo(() => {
    if (!selectedProject) return [];
    const query = memberQuery.trim().toLowerCase();
    if (!query) return draftMembers;
    return draftMembers.filter(
      (member) =>
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query),
    );
  }, [draftMembers, memberQuery, selectedProject]);

  useEffect(() => {
    if (!selectedProject) {
      setDraftName('');
      setDraftDescription('');
      setDraftArchived(false);
      setDraftMembers([]);
      return;
    }

    setDraftName(selectedProject.name);
    setDraftDescription(selectedProject.description ?? '');
    setDraftArchived(Boolean(selectedProject.isArchived));
    setDraftMembers(selectedProject.members);
  }, [selectedProject]);

  const handleReset = (): void => {
    if (!selectedProject) return;
    setDraftName(selectedProject.name);
    setDraftDescription(selectedProject.description ?? '');
    setDraftArchived(Boolean(selectedProject.isArchived));
    setDraftMembers(selectedProject.members);
    setStatusMessage('');
  };

  const handleSave = async (): Promise<void> => {
    if (!selectedProject) return;
    if (!draftName.trim()) {
      setStatusMessage('Project name cannot be empty.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSaveProjectSettings({
        projectId: selectedProject.id,
        name: draftName,
        description: draftDescription,
        isArchived: draftArchived,
        members: draftMembers,
      });
      setStatusMessage(`Saved settings for "${draftName.trim()}".`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save settings.';
      setStatusMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canDeleteSelectedProject =
    Boolean(selectedProject) && user.globalRole === 'GLOBAL_ADMIN';

  const handleDeleteProject = async (): Promise<void> => {
    if (!selectedProject || !canDeleteSelectedProject) {
      if (!selectedProject) return;
      setStatusMessage('Only Global Admins can delete projects.');
      return;
    }

    const shouldDelete = window.confirm(
      `Delete project "${selectedProject.name}"? This action cannot be undone.`,
    );
    if (!shouldDelete) return;

    try {
      setIsSubmitting(true);
      await onDeleteProject({ projectId: selectedProject.id });
      setStatusMessage(`Deleted "${selectedProject.name}".`);
      setSelectedProjectId('');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete project.';
      setStatusMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDirectoryRole = (email: string, nextRole: ProjectRole): void => {
    setDirectoryRoles((prev) => ({ ...prev, [email]: nextRole }));
  };

  const handleAddUser = async (userId: string): Promise<void> => {
    if (!selectedProject) return;
    const directoryUser = directoryUsers.find((person) => person.id === userId);
    if (!directoryUser) return;
    const role = directoryRoles[directoryUser.email] ?? 'PROJECT_MEMBER';

    setDraftMembers((prev) => [
      ...prev,
      {
        id: directoryUser.id,
        name: directoryUser.name,
        email: directoryUser.email,
        role,
        avatarUrl: directoryUser.avatarUrl,
      },
    ]);
    setStatusMessage(
      `Added ${directoryUser.name} to the draft. Save settings to persist it.`,
    );
    setUserQuery('');
  };

  const handleUpdateMemberRole = async (
    memberId: string,
    nextRole: ProjectRole,
  ): Promise<void> => {
    if (!selectedProject) return;
    const nextMembers = draftMembers.map((member) =>
      member.id === memberId ? { ...member, role: nextRole } : member,
    );

    if (!nextMembers.some((member) => member.role === 'PROJECT_ADMIN')) {
      setStatusMessage('Each project must keep at least one admin.');
      return;
    }

    setDraftMembers(nextMembers);
    setStatusMessage(
      'Updated the draft member role. Save settings to persist it.',
    );
  };

  const handleRemoveMember = async (memberId: string): Promise<void> => {
    if (!selectedProject) return;
    const memberToRemove = draftMembers.find(
      (member) => member.id === memberId,
    );
    if (!memberToRemove) return;

    if (
      memberToRemove.role === 'PROJECT_ADMIN' &&
      !draftMembers.some(
        (member) => member.id !== memberId && member.role === 'PROJECT_ADMIN',
      )
    ) {
      setStatusMessage('Each project must keep at least one admin.');
      return;
    }

    setDraftMembers((prev) => prev.filter((member) => member.id !== memberId));
    setStatusMessage(
      `Removed ${memberToRemove.name} from the draft. Save settings to persist it.`,
    );
  };

  return {
    selectedProjectId,
    setSelectedProjectId,
    projectQuery,
    setProjectQuery,
    userQuery,
    setUserQuery,
    memberQuery,
    setMemberQuery,
    directoryRoles,
    draftName,
    setDraftName,
    draftDescription,
    setDraftDescription,
    draftArchived,
    setDraftArchived,
    draftMembers,
    statusMessage,
    isSubmitting,
    filteredProjects,
    selectedProject,
    availableUsers,
    filteredMembers,
    canDeleteSelectedProject,
    handleReset,
    handleSave,
    handleDeleteProject,
    updateDirectoryRole,
    handleAddUser,
    handleUpdateMemberRole,
    handleRemoveMember,
  };
};
