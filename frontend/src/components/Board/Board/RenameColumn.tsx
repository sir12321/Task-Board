import { useState } from 'react';
import styles from './RenameColumn.module.css';

interface Props {
  columnId: string;
  currentName: string;
  canManageColumns: boolean;
  onSubmit: (columnId: string, newName: string) => Promise<void> | void;
  onCancel: () => void;
  setShortError: (msg: string | null) => void;
}

/**
 * Modal used to rename a workflow column. It lives separately
 * from `Board.tsx` so the board stays concise and we can customize the
 * dialog styling or behaviour independently.
 */
const RenameColumn = ({
  columnId,
  currentName,
  canManageColumns,
  onSubmit,
  onCancel,
  setShortError,
}: Props) => {
  const titleId = 'rename-column-title';
  const inputId = 'rename-column-input';
  const [name, setName] = useState(currentName);

  const handleSave = async () => {
    if (!canManageColumns) {
      setShortError('Only ProjectAdmin can rename columns');
      return;
    }

    const trimmed = name.trim();
    if (trimmed === '') {
      setShortError('Column name cannot be empty');
      return;
    }

    try {
      await onSubmit(columnId, trimmed);
      onCancel();
    } catch {
      setShortError('Failed to rename column');
    }
  };

  return (
    <div className={styles.overlay}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h4 id={titleId} className={styles.heading}>
          Rename column
        </h4>
        <label htmlFor={inputId} className={styles.heading}>
          Column name
        </label>
        <input
          id={inputId}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.textInput}
        />
        <div className={styles.buttonRow}>
          <button type="button" onClick={onCancel} className={styles.button}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} className={styles.button}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenameColumn;
