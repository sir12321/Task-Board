import { Navigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import CreateProjectManager from '../../components/ProjectAccess/CreateProjectManager';
import { useAuth } from '../../context/AuthContext';

const CreateProjectPage = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  if (user.globalRole !== 'GLOBAL_ADMIN') {
    return <Navigate to="/assign-users" replace />;
  }

  return (
    <Layout>
      <CreateProjectManager />
    </Layout>
  );
};

export default CreateProjectPage;
