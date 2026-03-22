import { useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UserSettingsManager.module.css';
import UserSettingsHeader from './UserSettingsHeader';
import UserSettingsActions from './UserSettingsActions';
import ChangeNameModal from './ChangeNameModal';
import ChangePasswordModal from './ChangePasswordModal';
import type { AuthUser } from '../../types/Types';

interface Props {
  user: AuthUser;
  onChangeName: (nextName: string) => Promise<void>;
  onChangePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
}

const UserSettingsManager = ({
  user,
  onChangeName,
  onChangePassword,
}: Props) => {
  const navigate = useNavigate();
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameError, setNameError] = useState('');
  const [nameStatus, setNameStatus] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');

  useEffect(() => {
    setName(user.name || '');
  }, [user.name]);

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
      setPasswordError('New password and confirmed password do not match.');
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
          onImageClick={() => navigate('/user-settings/avatar')}
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
