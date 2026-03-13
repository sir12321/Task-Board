import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import CreateProjectManager from '../../components/ProjectAccess/CreateProject /CreateProjectManager';
import {
  createManagedProject,
  getDirectoryUser,
  getProjectDirectoryUsers,
} from './projectAccess';
import { useAuth } from '../../context/AuthContext';
import type { DirectoryUser, ProjectMemberSummary } from '../../types/Types';

const CreateProjectPage = () => {
  const { user } = useAuth();
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setLoadingError('');
        const users = await getProjectDirectoryUsers();
        if (!cancelled) {
          setDirectoryUsers(users);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadingError(
            (error as Error).message || 'Failed to load user directory.',
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
  }, []);

  const handleCreateProject = useCallback(
    async ({
      name,
      description,
      members,
      creatorEmail,
    }: {
      name: string;
      description: string;
      members: ProjectMemberSummary[];
      creatorEmail: string;
    }) => {
      await createManagedProject({
        name,
        description,
        members,
        creatorEmail,
      });
    },
    [],
  );

  if (!user) {
    return null;
  }

  const currentDirectoryUser = getDirectoryUser(user);

  if (user.globalRole !== 'GLOBAL_ADMIN') {
    return <Navigate to="/assign-users" replace />;
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '24px 28px' }}>Loading directory users...</div>
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
      <CreateProjectManager
        user={user}
        currentDirectoryUser={currentDirectoryUser}
        directoryUsers={directoryUsers}
        onCreateProject={handleCreateProject}
      />
    </Layout>
  );
};

export default CreateProjectPage;
