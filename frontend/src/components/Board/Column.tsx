import { useEffect, useRef, useState } from 'react';
import type { BoardColumn, Task } from '../../types/Types';
import TaskCard from '../Task/TaskCard';
import styles from './Column.module.css';

interface Properties {
  column: BoardColumn;
  tasks: Task[];
  onDropTask: (taskId: string, columnId: string) => void;
  onTaskClick?: (taskId: string) => void;
  onTaskEdit?: (taskId: string) => void;
  isDraggable?: boolean;
  canManageTasks?: boolean;
  onCreateTask?: (columnId: string) => void;
  canManageColumns?: boolean;
  onRenameColumn?: (columnId: string) => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  onMoveLeft?: (columnId: string) => void;
  onMoveRight?: (columnId: string) => void;
  onEditWip?: (columnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
}

const Column = ({
  column,
  tasks,
  onDropTask,
  onTaskClick,
  onTaskEdit,
  isDraggable,
  canManageTasks,
  onCreateTask,
  canManageColumns,
  onRenameColumn,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  onEditWip,
  onDeleteColumn,
}: Properties) => {
  const [workflowMenuOpen, setWorkflowMenuOpen] = useState(false);
  const workflowMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!workflowMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        workflowMenuRef.current &&
        !workflowMenuRef.current.contains(event.target as Node)
      ) {
        setWorkflowMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [workflowMenuOpen]);

  return (
    <div
      className={styles.column}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const taskId = e.dataTransfer.getData('taskId');
        onDropTask(taskId, column.id);
      }}
    >
      <div className={styles.columnHeader}>
        <div className={styles.columnTitleRow}>
          <h3 className={styles.columnTitle}>{column.name}</h3>
          {canManageColumns && (
            <div className={styles.workflowMenuWrap} ref={workflowMenuRef}>
              <button
                type="button"
                className={styles.manageButton}
                onClick={() => setWorkflowMenuOpen((prev) => !prev)}
                aria-expanded={workflowMenuOpen}
                aria-label={`Manage ${column.name} workflow`}
              >
                Manage
              </button>

              {workflowMenuOpen && (
                <div className={styles.workflowMenu}>
                  {onMoveLeft && (
                    <button
                      type="button"
                      className={styles.workflowMenuButton}
                      onClick={() => {
                        onMoveLeft(column.id);
                        setWorkflowMenuOpen(false);
                      }}
                      disabled={!canMoveLeft}
                    >
                      Move Left
                    </button>
                  )}
                  {onMoveRight && (
                    <button
                      type="button"
                      className={styles.workflowMenuButton}
                      onClick={() => {
                        onMoveRight(column.id);
                        setWorkflowMenuOpen(false);
                      }}
                      disabled={!canMoveRight}
                    >
                      Move Right
                    </button>
                  )}
                  {onRenameColumn && (
                    <button
                      type="button"
                      className={styles.workflowMenuButton}
                      onClick={() => {
                        onRenameColumn(column.id);
                        setWorkflowMenuOpen(false);
                      }}
                    >
                      Rename
                    </button>
                  )}
                  {onEditWip && (
                    <button
                      type="button"
                      className={styles.workflowMenuButton}
                      onClick={() => {
                        onEditWip(column.id);
                        setWorkflowMenuOpen(false);
                      }}
                    >
                      Edit WIP
                    </button>
                  )}
                  {onDeleteColumn && (
                    <button
                      type="button"
                      className={`${styles.workflowMenuButton} ${styles.deleteAction}`}
                      onClick={() => {
                        onDeleteColumn(column.id);
                        setWorkflowMenuOpen(false);
                      }}
                    >
                      Delete Column
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div className={styles['wip-limit']}>
          {column.wipLimit ? `${tasks.length}/${column.wipLimit}` : 'No WIP limit'}
        </div>
      </div>
      {canManageTasks && onCreateTask && (
        <button
          type="button"
          className={styles.createButton}
          onClick={() => onCreateTask(column.id)}
        >
          + Create task
        </button>
      )}

      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
          onEdit={onTaskEdit ? () => onTaskEdit(task.id) : undefined}
          isDraggable={Boolean(isDraggable && column.id !== 'col-story')}
        />
      ))}
    </div>
  );
};

export default Column;
