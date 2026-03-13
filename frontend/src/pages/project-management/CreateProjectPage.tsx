import { useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import CreateProjectManager from '../../components/ProjectAccess/CreateProjectManager';
import {
  createManagedProject,
  getDirectoryUser,
  getProjectDirectoryUsers,
} from './projectAccess';
import { useAuth } from '../../context/AuthContext';
import type { ProjectMemberSummary } from '../../types/Types';

const CreateProjectPage = () => {
  const { user } = useAuth();
  const directoryUsers = useMemo(() => getProjectDirectoryUsers(), []);

  if (!user) {
    return null;
  }

  const currentDirectoryUser = getDirectoryUser(user);

  if (user.globalRole !== 'GLOBAL_ADMIN') {
    return <Navigate to="/assign-users" replace />;
  }

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
