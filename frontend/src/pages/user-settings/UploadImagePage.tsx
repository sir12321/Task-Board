import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import UploadImageManager from '../../components/UserSettings/UploadImageManager';
import { useAuth } from '../../context/AuthContext';
import { uploadUserAvatar } from './UserSettingsConnector';

const UploadImagePage = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const handleSaveImage = async (avatarUrl: string): Promise<void> => {
    const uploadedAvatarUrl = await uploadUserAvatar(avatarUrl);
    setUser((prev) =>
      prev
        ? {
            ...prev,
            avatarUrl: uploadedAvatarUrl ?? prev.avatarUrl,
          }
        : prev,
    );
  };

  return (
    <Layout>
      <UploadImageManager
        user={user}
        onSaveImage={handleSaveImage}
        onBack={() => navigate('/user-settings')}
      />
    </Layout>
  );
};

export default UploadImagePage;
