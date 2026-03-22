import { useEffect, useRef, useState } from 'react';
import type {
  BoardColumn,
  Task,
  ProjectRole as ProjectRole,
} from '../../../types/Types';
import TaskCard from '../Task/TaskCard/TaskCard';
import styles from './Column.module.css';

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
  const [workflowMenuOpen, setWorkflowMenuOpen] = useState(false);
  const workflowMenuRef = useRef<HTMLDivElement | null>(null);
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
