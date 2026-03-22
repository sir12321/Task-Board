import { useEffect, useRef, useState } from 'react';
import type {
  BoardColumn,
  Task,
  ProjectRole as ProjectRole,
} from '../../../types/Types';
import TaskCard from '../Task/TaskCard/TaskCard';
import styles from './Column.module.css';

// Props for the Column component. This acts as a versatile UI piece used by
// the Board to display a workflow column. Many callbacks are optional as the
// board may operate in read-only or limited-permission modes.
interface Properties {
  userRole: ProjectRole;
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
  canDeleteColumn?: boolean;
  isClosedWorkflowColumn?: boolean;
  closedWorkflowColumnName?: string | null;
}

const Column = ({
  userRole,
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
  canDeleteColumn = true,
  isClosedWorkflowColumn = false,
  closedWorkflowColumnName = null,
}: Properties) => {
  // UI state for the workflow management dropdown
  const [workflowMenuOpen, setWorkflowMenuOpen] = useState(false);
  const workflowMenuRef = useRef<HTMLDivElement | null>(null);

  // WIP limit calculations used to render the indicator bar
  const hasWipLimit =
    typeof column.wipLimit === 'number' && column.wipLimit > 0;
  const isAtCapacity =
    hasWipLimit && (column.wipLimit ? tasks.length >= column.wipLimit : false);
  const wipProgressPercent = hasWipLimit
    ? Math.min(
        (tasks.length / (column.wipLimit ? column.wipLimit : 1)) * 100,
        100,
      )
    : 0;

  // Close the workflow menu when clicking anywhere outside of it. This
  // effect attaches a global listener when the menu is open and cleans up
  // afterward to avoid memory leaks.
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
      className={`${styles.column} ${column.name === 'Stories' ? styles.storyColumn : ''}`}
      // In the HTML drag‑and‑drop API the browser’s default behaviour for a dragged item over an element is “not a valid drop target”.
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const taskId = e.dataTransfer.getData('taskId');
        onDropTask(taskId, column.id);
      }}
    >
      <div className={styles.columnHeader}>
        {/* title row contains name and optional manage button */}
        <div className={styles.columnTitleRow}>
          <h3 className={styles.columnTitle}>{column.name}</h3>
          {canManageColumns && (
            <div className={styles.workflowMenuWrap} ref={workflowMenuRef}>
              <button
                type="button"
                className={styles.manageButton}
                onClick={() => setWorkflowMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={workflowMenuOpen}
                aria-controls={`column-manage-menu-${column.id}`}
                aria-label={`Manage column ${column.name}`}
              >
                Manage
              </button>

              {workflowMenuOpen && (
                <div
                  className={styles.workflowMenu}
                  id={`column-manage-menu-${column.id}`}
                  role="menu"
                >
                  {/* workflow action buttons shown conditionally */}
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
                  {onDeleteColumn && canDeleteColumn && (
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
        {/* WIP indicator shows task count vs limit or an unlimited message */}
        {hasWipLimit ? (
          <div className={styles.wipIndicator}>
            <div className={styles.wipProgressTrack}>
              <div
                className={`${styles.wipProgressFill} ${isAtCapacity ? styles.wipProgressFillFull : ''}`}
                style={{ width: `${wipProgressPercent}%` }}
              />
            </div>
            <div
              className={`${styles.wipCount} ${isAtCapacity ? styles.wipCountFull : ''}`}
            >
              {tasks.length}/{column.wipLimit} tasks
            </div>
          </div>
        ) : (
          <div className={styles.wipIndicator}>
            <div className={styles.wipProgressTrackFull}>
              <div
                className={`${styles.wipProgressFill} ${isAtCapacity ? styles.wipProgressFillFull : ''}`}
                style={{ width: `${wipProgressPercent}%` }}
              />
            </div>
            <div
              className={`${styles.wipCount} ${isAtCapacity ? styles.wipCountFull : ''}`}
            >
              No WIP limit
            </div>
          </div>
        )}
      </div>
      {canManageTasks && onCreateTask && (
        <button
          type="button"
          className={styles.createButton}
          onClick={() => onCreateTask(column.id)}
          aria-label={`Create task in column ${column.name}`}
        >
          + Create task
        </button>
      )}

      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
          onEdit={
            !isClosedWorkflowColumn &&
            onTaskEdit &&
            !(
              task.type === 'STORY' &&
              Boolean(closedWorkflowColumnName) &&
              task.status.trim().toLowerCase() ===
                closedWorkflowColumnName?.trim().toLowerCase()
            )
              ? () => onTaskEdit(task.id)
              : undefined
          }
          isDraggable={Boolean(isDraggable) && !isClosedWorkflowColumn}
          projectRole={userRole}
        />
      ))}
    </div>
  );
};

export default Column;
