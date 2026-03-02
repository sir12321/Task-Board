import type { Task } from '../../types/Board';
import styles from './TaskDetailsModal.module.css';

interface Props {
  task: Task;
  onClose: () => void;
}

const TaskDetailsModal = ({ task, onClose }: Props) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'None';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const firstAssignee =
    task.assigneeIds && task.assigneeIds.length > 0
      ? task.assigneeIds[0]
      : null;

  return (
    <div className={styles['modal-overlay']} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles['close-btn']} onClick={onClose}>
          ✕
        </button>

        <div className={styles.container}>
          {/* Main content (left) */}
          <div className={styles.content}>
            <h2 className={styles.title}>{task.title}</h2>
            <p className={styles.description}>{task.description}</p>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Activity</h3>
              <div className={styles.activityPlaceholder}>
                Comments and history go here.
              </div>
            </section>
          </div>

          {/* Sidebar (right) */}
          <aside className={styles.sidebar}>
            <div className={styles.detailsCard}>
              <h4 className={styles.detailsTitle}>Details</h4>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Assignee</div>
                <div className={styles.detailValue}>
                  {firstAssignee ? (
                    <div
                      className={styles.avatarSmall}
                      title={`Assignee: ${firstAssignee}`}
                    >
                      {firstAssignee.slice(0, 2).toUpperCase()}
                    </div>
                  ) : (
                    <button className={styles.linkButton}>Assign to me</button>
                  )}
                </div>
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
                <div className={styles.detailLabel}>Reporter</div>
                <div className={styles.detailValue}>{task.reporterId}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsModal;
