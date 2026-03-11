import { useState } from 'react';
import styles from './AddColumn.module.css';

interface Props {
  onSubmit: (columnName: string) => Promise<void> | void;
  onCancel: () => void;
  setShortError: (msg: string | null) => void;
}

/**
 * Modal dialog for adding a new workflow column.
 * Mirrors the pattern of RenameColumn / EditWIPColumn.
 */
const AddColumn = ({ onSubmit, onCancel, setShortError }: Props) => {
  const [name, setName] = useState('');

  const handleSave = async () => {
    const trimmed = name.trim();
    if (trimmed === '') {
      setShortError('Column name cannot be empty');
      return;
    }

    try {
      await onSubmit(trimmed);
      onCancel();
    } catch (err) {
      setShortError((err as Error)?.message ?? 'Failed to add column');
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h4 className={styles.heading}>Add column</h4>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Column name"
          className={styles.textInput}
          autoFocus
        />
        <div className={styles.buttonRow}>
          <button type="button" onClick={onCancel} className={styles.button}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} className={styles.button}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddColumn;
