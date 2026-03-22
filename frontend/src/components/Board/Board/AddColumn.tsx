import { useState } from 'react';
import styles from './AddColumn.module.css';

interface Props {
  onSubmit: (columnName: string) => Promise<void> | void;
  onCancel: () => void;
  setShortError: (msg: string | null) => void;
}

/**
 * Modal dialog for adding a workflow column.
 * Validation lives here so the board component stays focused on orchestration.
 */
const AddColumn = ({ onSubmit, onCancel, setShortError }: Props) => {
  const titleId = 'add-column-title';
  const inputId = 'add-column-name';
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
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h4 id={titleId} className={styles.heading}>
          Add column
        </h4>
        <label htmlFor={inputId} className={styles.heading}>
          Column name
        </label>
        <input
          id={inputId}
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
