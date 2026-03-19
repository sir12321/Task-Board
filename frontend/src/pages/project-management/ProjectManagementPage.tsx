import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProjectManagementPage = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Navigate
      to={
        user.globalRole === 'GLOBAL_ADMIN' ? '/create-project' : '/assign-users'
      }
      replace
    />
  );
};

export default ProjectManagementPage;
