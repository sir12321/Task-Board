import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import AssignUsersManager from '../../components/ProjectAccess/AssignUsersRole/AssignUsersManager';
import { getGlobalAdminEmails } from './projectAccess';
import { useAuth } from '../../context/AuthContext';
import type { ProjectDetails, ProjectRole } from '../../types/Types';
import { apiClient } from '../../utils/api';

const removeGlobalAdminsFromProjects = (
  projects: ProjectDetails[],
): ProjectDetails[] => {
  const globalAdminEmails = getGlobalAdminEmails();

  return projects.map((project) => ({
    ...project,
    members: project.members.filter(
      (member) => !globalAdminEmails.has(member.email),
    ),
  }));
};

const AssignUsersPage = () => {
  const { user } = useAuth();
  const [adminProjects, setAdminProjects] = useState<ProjectDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');

  const loadProjects = useCallback(async (): Promise<void> => {
    const projects: ProjectDetails[] = await apiClient('/projects');
    setAdminProjects(
      removeGlobalAdminsFromProjects(
        projects.filter((project) => project.userRole === 'PROJECT_ADMIN'),
      ),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user || user.globalRole === 'GLOBAL_ADMIN') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLoadingError('');
        const projects: ProjectDetails[] = await apiClient('/projects');
        if (!cancelled) {
          setAdminProjects(
            removeGlobalAdminsFromProjects(
              projects.filter((project) => project.userRole === 'PROJECT_ADMIN'),
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

  const handleUpdateAssignedRole = useCallback(
    async (projectId: string, memberId: string, role: ProjectRole) => {
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

  if (user.globalRole === 'GLOBAL_ADMIN') {
    return <Navigate to="/project-settings" replace />;
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '24px 28px' }}>Loading assign users...</div>
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
      <AssignUsersManager
        user={user}
        adminProjects={adminProjects}
        onUpdateAssignedRole={handleUpdateAssignedRole}
      />
    </Layout>
  );
};

export default AssignUsersPage;
