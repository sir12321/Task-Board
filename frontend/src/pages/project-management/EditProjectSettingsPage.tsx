import { useCallback, useEffect, useState } from 'react';
import Layout from '../../components/Layout/Layout';
import EditProjectSettingsManager from '../../components/ProjectAccess/EditProjectSettings/EditProjectSettingsManager';
import { getGlobalAdminEmails, getProjectDirectoryUsers } from './projectAccess';
import { useAuth } from '../../context/AuthContext';
import type { DirectoryUser, ProjectDetails, ProjectRole } from '../../types/Types';
import { apiClient } from '../../utils/api';

const removeGlobalAdminsFromProjects = (
  projects: ProjectDetails[],
  globalAdminEmails: Set<string>,
): ProjectDetails[] => {
  return projects.map((project) => ({
    ...project,
    members: project.members.filter(
      (member) => !globalAdminEmails.has(member.email),
    ),
  }));
};

const EditProjectSettingsPage = () => {
  const { user } = useAuth();
  const [adminProjects, setAdminProjects] = useState<ProjectDetails[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');

  const loadProjects = useCallback(async (): Promise<void> => {
    const [projects, users] = await Promise.all([
      apiClient('/projects') as Promise<ProjectDetails[]>,
      getProjectDirectoryUsers(),
    ]);

    const globalAdminEmails = getGlobalAdminEmails(users);
    setDirectoryUsers(users);

    setAdminProjects(
      removeGlobalAdminsFromProjects(
        projects.filter((project) => project.userRole === 'PROJECT_ADMIN'),
        globalAdminEmails,
      ),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLoadingError('');
        const [projects, users] = await Promise.all([
          apiClient('/projects') as Promise<ProjectDetails[]>,
          getProjectDirectoryUsers(),
        ]);

        const globalAdminEmails = getGlobalAdminEmails(users);

        if (!cancelled) {
          setDirectoryUsers(users);
          setAdminProjects(
            removeGlobalAdminsFromProjects(
              projects.filter((project) => project.userRole === 'PROJECT_ADMIN'),
              globalAdminEmails,
            ),
          );
        }
      } catch (error) {
        if (!cancelled) {
          setLoadingError(
            (error as Error).message || 'Failed to load managed projects.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSaveProjectSettings = useCallback(
    async ({
      projectId,
      name,
      description,
      isArchived,
    }: {
      projectId: string;
      name: string;
      description: string;
      isArchived: boolean;
    }) => {
      await apiClient(`/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isArchived,
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      setAdminProjects((prev) =>
        prev.map((project) =>
          project.id === projectId
            ? {
                ...project,
                name: name.trim(),
                description: description.trim() || null,
                isArchived,
              }
            : project,
        ),
      );
    },
    [],
  );

  const handleAddProjectMember = useCallback(
    async ({
      projectId,
      memberEmail,
      role,
    }: {
      projectId: string;
      memberEmail: string;
      role: ProjectRole;
    }) => {
      await apiClient(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: memberEmail,
          role,
        }),
      });
      await loadProjects();
    },
    [loadProjects],
  );

  const handleUpdateProjectMemberRole = useCallback(
    async ({
      projectId,
      memberId,
      role,
    }: {
      projectId: string;
      memberId: string;
      role: ProjectRole;
    }) => {
      await apiClient(`/projects/${projectId}/members/${memberId}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      await loadProjects();
    },
    [loadProjects],
  );

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '24px 28px' }}>Loading project settings...</div>
      </Layout>
    );
  }

  if (loadingError) {
    return (
      <Layout>
        <div style={{ padding: '24px 28px' }}>{loadingError}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <EditProjectSettingsManager
        user={user}
        adminProjects={adminProjects}
        directoryUsers={directoryUsers}
        onSaveProjectSettings={handleSaveProjectSettings}
        onAddProjectMember={handleAddProjectMember}
        onUpdateProjectMemberRole={handleUpdateProjectMemberRole}
      />
    </Layout>
  );
};

export default EditProjectSettingsPage;
