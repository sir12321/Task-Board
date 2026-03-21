import { useCallback, useEffect, useState } from 'react';
import Layout from '../../components/Layout/Layout';
import EditProjectSettingsManager from '../../components/ProjectAccess/EditProjectSettings/EditProjectSettingsManager';
import {
  getGlobalAdminEmails,
  getProjectDirectoryUsers,
  saveManagedProjectSettings,
} from './projectAccess';
import { useAuth } from '../../context/AuthContext';
import type { DirectoryUser, ProjectDetails } from '../../types/Types';
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

    const manageableProjects =
      user?.globalRole === 'GLOBAL_ADMIN'
        ? projects
        : projects.filter((project) => project.userRole === 'PROJECT_ADMIN');

    setAdminProjects(
      removeGlobalAdminsFromProjects(manageableProjects, globalAdminEmails),
    );
  }, [user?.globalRole]);

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
        const manageableProjects =
          user.globalRole === 'GLOBAL_ADMIN'
            ? projects
            : projects.filter(
                (project) => project.userRole === 'PROJECT_ADMIN',
              );

        if (!cancelled) {
          setDirectoryUsers(users);
          setAdminProjects(
            removeGlobalAdminsFromProjects(
              manageableProjects,
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
      members,
    }: {
      projectId: string;
      name: string;
      description: string;
      isArchived: boolean;
      members: ProjectDetails['members'];
    }) => {
      const currentProject = adminProjects.find(
        (project) => project.id === projectId,
      );
      if (!currentProject) {
        throw new Error('Project not found');
      }

      await saveManagedProjectSettings({
        project: currentProject,
        name,
        description,
        isArchived,
        members,
      });
      await loadProjects();
    },
    [adminProjects, loadProjects],
  );

  const handleDeleteProject = useCallback(
    async ({ projectId }: { projectId: string }) => {
      await apiClient(`/projects/${projectId}`, {
        method: 'DELETE',
      });

      setAdminProjects((prev) =>
        prev.filter((project) => project.id !== projectId),
      );
    },
    [],
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
        onDeleteProject={handleDeleteProject}
      />
    </Layout>
  );
};

export default EditProjectSettingsPage;
