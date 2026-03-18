import { useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';
import styles from './UserSettingsManager.module.css';
import UserSettingsHeader from './UserSettingsHeader';
import UserSettingsActions from './UserSettingsActions';
import ChangeNameModal from './ChangeNameModal';
import ChangePasswordModal from './ChangePasswordModal';
import type { AuthUser } from '../../types/Types';
import ChangeAvatarModal from './ChangeAvatarModal';

interface Props {
  user: AuthUser;
  onChangeAvatar: (avatarUrl: string) => Promise<void>;
  onChangeName: (nextName: string) => Promise<void>;
  onChangePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
}

const UserSettingsManager = ({
  user,
  onChangeAvatar,
  onChangeName,
  onChangePassword,
}: Props) => {
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState('');
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [avatarError, setAvatarError] = useState('');
  const [avatarStatus, setAvatarStatus] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameStatus, setNameStatus] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');

  useEffect(() => {
    setName(user.name || '');
  }, [user]);

  useEffect(() => {
    if (!avatarError) {
      return;
    }
    const timer = window.setTimeout(() => {
      setAvatarError('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [avatarError]);

  useEffect(() => {
    if (!avatarStatus) {
      return;
    }
    const timer = window.setTimeout(() => {
      setAvatarStatus('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [avatarStatus]);

  useEffect(() => {
    if (!nameError) {
      return;
    }
    const timer = window.setTimeout(() => {
      setNameError('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [nameError]);

  useEffect(() => {
    if (!nameStatus) {
      return;
    }
    const timer = window.setTimeout(() => {
      setNameStatus('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [nameStatus]);

  useEffect(() => {
    if (!passwordError) {
      return;
    }
    const timer = window.setTimeout(() => {
      setPasswordError('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [passwordError]);

  useEffect(() => {
    if (!passwordStatus) {
      return;
    }
    const timer = window.setTimeout(() => {
      setPasswordStatus('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [passwordStatus]);

  const handleSaveAvatar = async (e: SyntheticEvent) => {
    e.preventDefault();
    setAvatarError('');
    setAvatarStatus('');

    const trimmedUrl = avatarUrl.trim();

    if (!trimmedUrl) {
      setAvatarError('Avatar URL cannot be empty.');
      return;
    }

    try {
      await onChangeAvatar(trimmedUrl);
      setAvatarStatus('Avatar updated.');
      setShowAvatarModal(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update avatar.';
      setAvatarError(message);
    }
  };

  const handleSaveName = async (e: SyntheticEvent) => {
    e.preventDefault();
    setNameError('');
    setNameStatus('');

    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError('Name cannot be empty.');
      return;
    }

    if (trimmedName === user.name.trim()) {
      setNameStatus('No changes to save.');
      return;
    }

    try {
      await onChangeName(trimmedName);
      setNameStatus('Name updated.');
      setShowNameModal(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update name.';
      setNameError(message);
    }
  };

  const handleChangePassword = async (e: SyntheticEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordStatus('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    try {
      await onChangePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStatus('Password updated.');
      setShowPasswordModal(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update password.';
      setPasswordError(message);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.stack}>
        <UserSettingsHeader
          name={user.name}
          avatarUrl={user.avatarUrl}
          onImageClick={() => {
            setAvatarError('');
            setAvatarStatus('');
            setAvatarUrl(user.avatarUrl || '');
            setShowAvatarModal(true);
          }}
        />
        <UserSettingsActions
          onChangeName={() => {
            setNameError('');
            setNameStatus('');
            setName(user.name);
            setShowNameModal(true);
          }}
          onChangePassword={() => {
            setPasswordError('');
            setPasswordStatus('');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordModal(true);
          }}
          nameStatus={nameStatus}
          passwordStatus={passwordStatus}
        />
      </div>

      <ChangeAvatarModal
        open={showAvatarModal}
        avatarUrl={avatarUrl}
        error={avatarError}
        onClose={() => setShowAvatarModal(false)}
        onAvatarUrlChange={setAvatarUrl}
        onSubmit={handleSaveAvatar}
      />

      <ChangeNameModal
        open={showNameModal}
        name={name}
        error={nameError}
        onClose={() => setShowNameModal(false)}
        onNameChange={setName}
        onSubmit={handleSaveName}
      />
      <ChangePasswordModal
        open={showPasswordModal}
        currentPassword={currentPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        error={passwordError}
        onClose={() => setShowPasswordModal(false)}
        onCurrentPasswordChange={setCurrentPassword}
        onNewPasswordChange={setNewPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handleChangePassword}
      />
    </div>
  );
};

export default UserSettingsManager;
