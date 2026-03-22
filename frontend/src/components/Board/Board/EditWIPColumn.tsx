import { useState } from 'react';
import styles from './EditWip.module.css';

interface Props {
  columnId: string;
  currentWip: number | null;
  columnTaskCount: number;
  onSubmit: (columnId: string, wipLimit: number | null) => Promise<void> | void;
  onCancel: () => void;
  setShortError: (msg: string | null) => void;
}

/**
 * Modal dialog for editing a column WIP limit.
 * The parent passes data in, but validation stays local to this form.
 */
const EditWIPColumn = ({
  columnId,
  currentWip,
  columnTaskCount,
  onSubmit,
  onCancel,
  setShortError,
}: Props) => {
  const titleId = 'edit-wip-title';
  const inputId = 'edit-wip-input';
  const [value, setValue] = useState(
    currentWip === null ? '' : String(currentWip),
  );

  const handleSave = async () => {
    const trimmed = value.trim();
    let nextWip: number | null = null;

    if (trimmed !== '') {
      const parsed = Number(trimmed);
      if (!Number.isInteger(parsed) || parsed < 1) {
        setShortError('WIP must be an integer >= 1, or empty for no limit');
        return;
      }
      if (parsed < columnTaskCount) {
        setShortError(
          `WIP limit cannot be less than current number of tasks (${columnTaskCount})`,
        );
        return;
      }
      nextWip = parsed;
    }

    try {
      await onSubmit(columnId, nextWip);
      onCancel();
    } catch (err) {
      setShortError((err as Error)?.message ?? 'Failed to update WIP limit');
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
          Set WIP limit
        </h4>
        <label htmlFor={inputId} className={styles.heading}>
          WIP limit
        </label>
        <input
          id={inputId}
          type="number"
          min={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Empty = no limit"
          className={styles.textInput}
          aria-describedby={titleId}
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

export default EditWIPColumn;
