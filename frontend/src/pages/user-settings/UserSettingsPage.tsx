import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import UserSettingsManager from '../../components/UserSettings/UserSettingsManager';
import { useAuth } from '../../context/AuthContext';

const UserSettingsPage = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const handleChangeName = async (nextName: string): Promise<void> => {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            name: nextName,
          }
        : prev,
    );
  };

  const handleChangePassword = async (_input: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> => {
    return Promise.resolve();
  };

  return (
    <Layout>
      <UserSettingsManager
        user={user}
        onUploadImageClick={() => navigate('/user-settings/upload-image')}
        onChangeName={handleChangeName}
        onChangePassword={handleChangePassword}
      />
    </Layout>
  );
};

export default UserSettingsPage;
