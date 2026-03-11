import styles from './DeleteColumn.module.css';

interface Props {
  columnId: string;
  columnName: string;
  onSubmit: (columnId: string) => Promise<void> | void;
  onCancel: () => void;
  setShortError: (msg: string | null) => void;
}

/**
 * Confirmation modal for deleting a workflow column.
 * Replaces the native window.confirm so the UI stays consistent.
 */
const DeleteColumn = ({
  columnId,
  columnName,
  onSubmit,
  onCancel,
  setShortError,
}: Props) => {
  const handleConfirm = async () => {
    try {
      await onSubmit(columnId);
      onCancel();
    } catch (err) {
      setShortError((err as Error)?.message ?? 'Failed to delete column');
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h4 className={styles.heading}>Delete column</h4>
        <p className={styles.message}>
          Are you sure you want to delete <strong>"{columnName}"</strong>? This
          cannot be undone.
        </p>
        <div className={styles.buttonRow}>
          <button type="button" onClick={onCancel} className={styles.button}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`${styles.button} ${styles.danger}`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteColumn;
