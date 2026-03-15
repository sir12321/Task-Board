import { useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { getInitials } from '../../utils/getInitials';
import styles from './UploadImageManager.module.css';
import type { AuthUser } from '../../types/Types';

interface Props {
  user: AuthUser;
  onSaveImage: (file: File) => Promise<void>;
  onBack: () => void;
}

const UploadImageManager = ({ user, onSaveImage, onBack }: Props) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displayAvatar = previewUrl ?? user.avatarUrl ?? null;

  const handleFileChange = (e: SyntheticEvent<HTMLInputElement>) => {
    setError('');
    const file = e.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const blobUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(blobUrl);
  };

  const handleSaveImage = async () => {
    if (!selectedFile) {
      setError('Please select an image first.');
      return;
    }
    try {
      await onSaveImage(selectedFile);
      onBack();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save image.';
      setError(message);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Upload Image</h1>

        <div className={styles.preview}>
          {displayAvatar ? (
            <img src={displayAvatar} alt="avatar preview" className={styles.avatar} />
          ) : (
            <div className={styles.fallback}>{getInitials(user.name)}</div>
          )}
        </div>

        <input
          className={styles.fileInput}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button className={styles.button} type="button" onClick={handleSaveImage}>
            Save Image
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
