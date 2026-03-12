import { Navigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import AssignUsersManager from '../../components/ProjectAccess/AssignUsersManager';
import { useAuth } from '../../context/AuthContext';

const AssignUsersPage = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  if (user.globalRole === 'GLOBAL_ADMIN') {
    return <Navigate to="/project-settings" replace />;
  }

  return (
    <Layout>
      <AssignUsersManager />
    </Layout>
  );
};

export default AssignUsersPage;
