import styles from './UserSettingsManager.module.css';
import type { SyntheticEvent } from 'react';

interface Props {
  open: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  error: string;
  onClose: () => void;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (e: SyntheticEvent) => void;
}

const ChangePasswordModal = ({
  open,
  currentPassword,
  newPassword,
  confirmPassword,
  error,
  onClose,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: Props) => {
  if (!open) {
    return null;
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>Change Password</h3>
        <form onSubmit={onSubmit} className={styles.form}>
          <label className={styles.label} htmlFor="settings-current-password">
            Current Password
          </label>
          <input
            id="settings-current-password"
            className={styles.input}
            type="password"
            value={currentPassword}
            onChange={(e) => onCurrentPasswordChange(e.target.value)}
          />
          <label className={styles.label} htmlFor="settings-new-password">
            New Password
          </label>
          <input
            id="settings-new-password"
            className={styles.input}
            type="password"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
          />
          <label className={styles.label} htmlFor="settings-confirm-password">
            Confirm New Password
          </label>
          <input
            id="settings-confirm-password"
            className={styles.input}
            type="password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
          />
          {error && <p className={styles.error}>{error}</p>}
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

export default ChangePasswordModal;
