import { useMemo, useState } from 'react';
import type { BoardColumn, BoardWorkflow } from '../../../types/Types';
import styles from './WorkflowEditor.module.css';

interface Props {
  title: string;
  description: string;
  columns: BoardColumn[];
  workflow: BoardWorkflow;
  onSubmit: (workflow: BoardWorkflow) => Promise<void> | void;
  onCancel: () => void;
  setShortError: (message: string | null) => void;
}

const WorkflowEditor = ({
  title,
  description,
  columns,
  workflow,
  onSubmit,
  onCancel,
  setShortError,
}: Props) => {
  const titleId = 'workflow-editor-title';
  const descriptionId = 'workflow-editor-description';
  const resolvedSelectId = 'workflow-resolved-column';
  const closedSelectId = 'workflow-closed-column';
  const storyColumn = useMemo(
    () =>
      columns.find(
        (column) => column.id === workflow.storyColumnId || column.order === 0,
      ) ?? null,
    [columns, workflow.storyColumnId],
  );

  const nonStoryColumns = useMemo(
    () =>
      columns
        .filter((column) => column.id !== storyColumn?.id)
        .sort((a, b) => a.order - b.order),
    [columns, storyColumn?.id],
  );

  const initialWorkflowColumnIds = useMemo(() => {
    const orderedIds = workflow.workflowColumnIds.filter((columnId) =>
      nonStoryColumns.some((column) => column.id === columnId),
    );
    const missingIds = nonStoryColumns
      .map((column) => column.id)
      .filter((columnId) => !orderedIds.includes(columnId));

    return [...orderedIds, ...missingIds];
  }, [nonStoryColumns, workflow.workflowColumnIds]);

  const [value, setValue] = useState<BoardWorkflow>({
    ...workflow,
    storyColumnId: storyColumn?.id ?? workflow.storyColumnId,
    workflowColumnIds: initialWorkflowColumnIds,
  });

  const workflowColumns = useMemo(
    () =>
      value.workflowColumnIds
        .map((columnId) =>
          nonStoryColumns.find((column) => column.id === columnId),
        )
        .filter((column): column is BoardColumn => Boolean(column)),
    [nonStoryColumns, value.workflowColumnIds],
  );

  const moveWorkflowColumn = (columnId: string, direction: 'up' | 'down') => {
    setValue((current) => {
      const currentIndex = current.workflowColumnIds.findIndex(
        (id) => id === columnId,
      );

      if (currentIndex < 0) {
        return current;
      }

      const targetIndex =
        direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= current.workflowColumnIds.length) {
        return current;
      }

      const nextWorkflowColumnIds = [...current.workflowColumnIds];
      const temp = nextWorkflowColumnIds[currentIndex];
      nextWorkflowColumnIds[currentIndex] = nextWorkflowColumnIds[targetIndex];
      nextWorkflowColumnIds[targetIndex] = temp;

      return {
        ...current,
        workflowColumnIds: nextWorkflowColumnIds,
      };
    });
  };

  const handleSave = async () => {
    if (!storyColumn) {
      setShortError('Stories column must stay first and separate');
      return;
    }

    if (value.workflowColumnIds.length !== nonStoryColumns.length) {
      setShortError('Every non-story column must be part of workflow order');
      return;
    }

    if (!value.resolvedColumnId) {
      setShortError('Resolved column mapping is required');
      return;
    }

    if (!value.closedColumnId) {
      setShortError('Closed column mapping is required');
      return;
    }

    if (!value.workflowColumnIds.includes(value.resolvedColumnId)) {
      setShortError('Resolved must be one of the workflow columns');
      return;
    }

    if (!value.workflowColumnIds.includes(value.closedColumnId)) {
      setShortError('Closed must be one of the workflow columns');
      return;
    }

    if (
      value.workflowColumnIds[value.workflowColumnIds.length - 1] !==
      value.closedColumnId
    ) {
      setShortError('Closed must be the last workflow column');
      return;
    }

    try {
      await onSubmit({
        ...value,
        storyColumnId: storyColumn.id,
      });
      onCancel();
    } catch (error) {
      setShortError((error as Error)?.message ?? 'Failed to update workflow');
    }
  };

  return (
    <div className={styles.overlay}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h4 id={titleId} className={styles.heading}>
          {title}
        </h4>
        <p id={descriptionId} className={styles.description}>
          {description}
        </p>

        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.label}>Stories Column</span>
            <div className={styles.select}>
              {storyColumn?.name ?? 'Stories'}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Workflow Order</span>
            {workflowColumns.map((column, index) => (
              <div
                key={column.id}
                className={`${styles.buttonRow} ${styles.workflowOrderRow}`}
              >
                <div
                  className={`${styles.select} ${styles.workflowOrderValue}`}
                >
                  {column.name}
                </div>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => moveWorkflowColumn(column.id, 'up')}
                  disabled={index === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => moveWorkflowColumn(column.id, 'down')}
                  disabled={index === workflowColumns.length - 1}
                >
                  Down
                </button>
              </div>
            ))}
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Resolved Column</span>
            <select
              id={resolvedSelectId}
              className={styles.select}
              value={value.resolvedColumnId ?? ''}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  resolvedColumnId: event.target.value || null,
                }))
              }
            >
              <option value="">Select column</option>
              {workflowColumns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Closed Column</span>
            <select
              id={closedSelectId}
              className={styles.select}
              value={value.closedColumnId ?? ''}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  closedColumnId: event.target.value || null,
                }))
              }
            >
              <option value="">Select column</option>
              {workflowColumns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.buttonRow}>
          <button type="button" className={styles.button} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={handleSave}
          >
            Save Workflow
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowEditor;
