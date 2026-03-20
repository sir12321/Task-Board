import { useState } from 'react';
import { getInitials } from '../../utils/getInitials';
import styles from './UploadImageManager.module.css';
import type { AuthUser } from '../../types/Types';

interface Props {
  user: AuthUser;
  onSaveImage: (avatarUrl: string) => Promise<void>;
  onBack: () => void;
}

const UploadImageManager = ({ user, onSaveImage, onBack }: Props) => {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState('');

  const displayAvatar = avatarUrl || user.avatarUrl || null;

  const handleSaveImage = async () => {
    if (!avatarUrl.trim()) {
      setError('Please enter a valid image URL.');
      return;
    }

    try {
      await onSaveImage(avatarUrl);
      onBack();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save image. Please try again.',
      );
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Update Avatar</h1>

        <div className={styles.preview}>
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt="avatar preview"
              className={styles.avatar}
            />
          ) : (
            <div className={styles.fallback}>{getInitials(user.name)}</div>
          )}
        </div>

        <input
          className={styles.fileInput}
          type="url"
          placeholder="Paste image URL here..."
          value={avatarUrl}
          onChange={(e) => {
            setAvatarUrl(e.target.value);
            setError('');
          }}
        />
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button
            className={styles.button}
            type="button"
            onClick={handleSaveImage}
          >
            Save
          </button>
          <button
            className={styles.cancelButton}
            type="button"
            onClick={onBack}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadImageManager;
