import type { Task } from '../../types/Types';
import styles from './TaskDetailsModal.module.css';

interface Props {
  task: Task;
  onClose: () => void;
  onDelete?: (taskId: string) => Promise<void> | void;
}

const TaskDetailsModal = ({ task, onClose, onDelete }: Props) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'None';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const Assignee = task.assigneeId ? task.assigneeId : null;

  return (
    <div className={styles['modal-overlay']} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles['close-btn']} onClick={onClose}>
          ✕
        </button>

        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.headerRow}>
              <h2 className={styles.title}>{task.title}</h2>
              <div className={styles.headerMeta}>
                <div className={styles.status}>{task.columnName}</div>
                <div className={styles.priorityBadge}>{task.priority}</div>
              </div>
            </div>

            <p className={styles.description}>
              {task.description || 'No description'}
            </p>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Activity</h3>
              <div className={styles.commentList}>
                {task.comments && task.comments.length > 0 ? (
                  task.comments.map((c) => (
                    <div className={styles.comment} key={c.id}>
                      <div className={styles.commentAvatar}>
                        {c.authorId.slice(0, 2).toUpperCase()}
                      </div>
                      <div className={styles.commentBody}>
                        <div className={styles.commentMeta}>
                          <strong>{c.authorId}</strong> ·{' '}
                          <span className={styles.commentTime}>
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className={styles.commentText}>{c.content}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.activityPlaceholder}>
                    No comments yet.
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.sidebarCard}>
              <div className={styles.rowBetween}>
                <div>
                  <div className={styles.smallLabel}>Assignee</div>
                  {Assignee ? (
                    <div
                      className={styles.assigneeRow}
                      title={`Assignee: ${Assignee}`}
                    >
                      <div className={styles.avatarSmall}>
                        {Assignee.slice(0, 2).toUpperCase()}
                      </div>
                      <div className={styles.assigneeName}>{Assignee}</div>
                    </div>
                  ) : (
                    <button className={styles.linkButton}>Assign to me</button>
                  )}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Reporter</div>
                <div className={styles.detailValue}>{task.reporterId}</div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Priority</div>
                <div className={styles.detailValue}>{task.priority}</div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Due date</div>
                <div className={styles.detailValue}>
                  {formatDate(task.dueDate)}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Parent</div>
                <div className={styles.detailValue}>
                  {task.parentId || 'None'}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Activity</div>
                <div className={styles.detailValue}>
                  {task.comments ? task.comments.length : 0}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>History</div>
              </div>
              {onDelete && (
                <div style={{ marginTop: 12 }}>
                  <button
                    className={styles.deleteButton}
                    onClick={async () => {
                      const ok = window.confirm('Delete this task?');
                      if (!ok) return;
                      try {
                        await onDelete(task.id);
                      } catch (e) {
                        // parent will handle errors/toasts
                      }
                      onClose();
                    }}
                  >
                    Delete task
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsModal;
