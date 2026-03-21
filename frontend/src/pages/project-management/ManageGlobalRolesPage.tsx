import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import GlobalRoleManager from '../../components/ProjectAccess/GlobalRoleAccess/GlobalRoleManager';
import { useAuth } from '../../context/AuthContext';
import type { DirectoryUser, GlobalRole } from '../../types/Types';
import {
  getProjectDirectoryUsers,
  updateDirectoryUserGlobalRole,
} from './projectAccess';

const ManageGlobalRolesPage = () => {
  const { user, fetchUser } = useAuth();
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');

  const loadDirectoryUsers = useCallback(async (): Promise<void> => {
    const users = await getProjectDirectoryUsers();
    setDirectoryUsers(users);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (user.globalRole !== 'GLOBAL_ADMIN') {
        setLoading(false);
        return;
      }

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
            (error as Error).message || 'Failed to load directory users.',
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

  const handleUpdateGlobalRole = useCallback(
    async (targetUserId: string, nextRole: GlobalRole) => {
      await updateDirectoryUserGlobalRole(targetUserId, nextRole);

      // Keep auth state in sync immediately after role changes so
      // role-gated routes/sidebar update without requiring a reload.
      await fetchUser();

      await loadDirectoryUsers();
    },
    [fetchUser, loadDirectoryUsers],
  );

  if (!user) {
    return null;
  }

  if (user.globalRole !== 'GLOBAL_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '24px 28px' }}>Loading global roles...</div>
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
      <GlobalRoleManager
        user={user}
        directoryUsers={directoryUsers}
        onUpdateGlobalRole={handleUpdateGlobalRole}
      />
    </Layout>
  );
};

export default ManageGlobalRolesPage;
