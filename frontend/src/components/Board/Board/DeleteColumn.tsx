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
 * Using a real modal keeps the flow consistent with the rest of the board UI.
 */
const DeleteColumn = ({
  columnId,
  columnName,
  onSubmit,
  onCancel,
  setShortError,
}: Props) => {
  const titleId = 'delete-column-title';
  const descriptionId = 'delete-column-description';
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
      <div
        className={styles.modal}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h4 id={titleId} className={styles.heading}>
          Delete column
        </h4>
        <p id={descriptionId} className={styles.message}>
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
