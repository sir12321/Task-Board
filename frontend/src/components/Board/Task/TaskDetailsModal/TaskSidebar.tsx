import type { Task } from '../../../../types/Types';
import styles from './TaskDetailsModal.module.css';
import { getInitials } from '../../../../utils/getInitials';

interface TaskSidebarProps {
  task: Task;
}

export const TaskSidebar = ({ task }: TaskSidebarProps) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    // Use UTC to avoid timezone shifting for dates stored at noon UTC
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  const assigneeName = task.assigneeName || 'Unassigned';
  const reporterName = task.reporterName || 'Unassigned';

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarCard}>
        <div className={styles.rowBetween}>
          <div>
            <div className={styles.smallLabel}>Assignee</div>
            {assigneeName ? (
              <div
                className={styles.assigneeRow}
                title={`Assignee: ${assigneeName}`}
              >
                <div className={styles.avatarSmall}>
                  {task.assigneeAvatarUrl ? (
                    <img src={task.assigneeAvatarUrl} alt={assigneeName} />
                  ) : (
                    getInitials(assigneeName)
                  )}
                </div>
                <div className={styles.assigneeName}>{assigneeName}</div>
              </div>
            ) : (
              <div className={styles.detailValue}>Unassigned</div>
            )}
          </div>
        </div>

        <div className={styles.rowBetween}>
          <div>
            <div className={styles.smallLabel}>Reporter</div>
            {reporterName ? (
              <div
                className={styles.assigneeRow}
                title={`Reporter: ${reporterName}`}
              >
                <div className={styles.avatarSmall}>
                  {task.reporterAvatarUrl ? (
                    <img src={task.reporterAvatarUrl} alt={reporterName} />
                  ) : (
                    getInitials(reporterName)
                  )}
                </div>
                <div className={styles.assigneeName}>{reporterName}</div>
              </div>
            ) : (
              <div className={styles.detailValue}>Unassigned</div>
            )}
          </div>
        </div>

        <div className={styles.detailRow}>
          <div className={styles.detailLabel}>Priority</div>
          <div className={styles.detailValue}>{task.priority}</div>
        </div>

        <div className={styles.detailRow}>
          <div className={styles.detailLabel}>Status</div>
          <div className={styles.detailValue}>
            {task.type === 'STORY' ? task.status : task.columnName}
          </div>
        </div>

        <div className={styles.detailRow}>
          <div className={styles.detailLabel}>Created on</div>
          <div className={styles.detailValue}>{formatDate(task.createdAt)}</div>
        </div>

        <div className={styles.detailRow}>
          <div className={styles.detailLabel}>Updated on</div>
          <div className={styles.detailValue}>{formatDate(task.updatedAt)}</div>
        </div>

        <div className={styles.detailRow}>
          <div className={styles.detailLabel}>Due date</div>
          <div className={styles.detailValue}>{formatDate(task.dueDate)}</div>
        </div>

        <div className={styles.detailRow}>
          <div className={styles.detailLabel}>Resolved on</div>
          <div className={styles.detailValue}>
            {formatDate(task.resolvedAt || null)}
          </div>
        </div>

        <div className={styles.detailRow}>
          <div className={styles.detailLabel}>Closed on</div>
          <div className={styles.detailValue}>
            {formatDate(task.closedAt || null)}
          </div>
        </div>

        <div className={styles.detailRow}>
          <div className={styles.detailLabel}>Parent</div>
          <div className={styles.detailValue}>{task.parentName || 'None'}</div>
        </div>

        {/* Only show delete button when user has sufficient role and a
            delete handler is provided. The parent component handles
            any error reporting for deletions. */}
      </div>
    </aside>
  );
};
