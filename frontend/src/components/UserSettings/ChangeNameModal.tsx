import styles from './UserSettingsManager.module.css';
import type { SyntheticEvent } from 'react';

interface Props {
  open: boolean;
  name: string;
  error: string;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onSubmit: (e: SyntheticEvent) => void;
}

const ChangeNameModal = ({
  open,
  name,
  error,
  onClose,
  onNameChange,
  onSubmit,
}: Props) => {
  if (!open) {
    return null;
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-name-title"
      >
        <h3 id="change-name-title" className={styles.modalTitle}>
          Change Name
        </h3>
        <form onSubmit={onSubmit} className={styles.form}>
          <label className={styles.label} htmlFor="settings-name">
            New Name
          </label>
          <input
            id="settings-name"
            className={styles.input}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter your new name"
          />
          {error && (
            <p className={styles.error} role="alert" aria-live="assertive">
              {error}
            </p>
          )}
          <div className={styles.modalActions}>
            <button className={styles.button} type="submit">
              Save
            </button>
            <button
              className={styles.cancelButton}
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangeNameModal;
