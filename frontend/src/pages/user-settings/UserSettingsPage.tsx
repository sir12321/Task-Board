import Layout from '../../components/Layout/Layout';
import UserSettingsManager from '../../components/UserSettings/UserSettingsManager';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../utils/api';

const UserSettingsPage = () => {
  const { user, setUser } = useAuth();

  if (!user) {
    return null;
  }

  const handleChangeName = async (nextName: string): Promise<void> => {
    const response = await apiClient('/users/name', {
      method: 'POST',
      body: JSON.stringify({ name: nextName }),
    });
    setUser((prev) =>
      prev
        ? {
            ...prev,
            name: response?.user?.name ?? nextName,
            avatarUrl: response?.user?.avatarUrl ?? prev.avatarUrl,
            email: response?.user?.email ?? prev.email,
          }
        : prev,
    );
  };

  const handleChangePassword = async (input: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> => {
    await apiClient('/users/password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      }),
    });
  };

  return (
    <Layout>
      <UserSettingsManager
        user={user}
        onChangeName={handleChangeName}
        onChangePassword={handleChangePassword}
      />
    </Layout>
  );
};

export default UserSettingsPage;
