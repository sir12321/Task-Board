import { useState } from 'react';
import type {
  Task as Task,
  ProjectRole as ProjectRole,
} from '../../../../types/Types';
import styles from './TaskDetailsModal.module.css';

/**
 * Props for the TaskDetailsModal component.
 * - `userRole`: role of the current user in the project (may affect actions)
 * - `task`: task object with all details to display
 * - `onClose`: callback to close the modal
 * - `onDelete`: optional delete handler for this task
 */
interface Properties {
  userRole: ProjectRole;
  task: Task;
  onClose: () => void;
  onDelete?: (taskId: string) => Promise<void> | void;
  // Optional callback invoked when user adds a comment. Parent may
  // persist the comment and refresh the task's comments list.
  onAddComment?: (content: string) => Promise<void> | void;
}

/**
 * TaskDetailsModal
 * Displays detailed information about a task in a modal overlay,
 * including title, status, description, activity/comments and metadata
 * such as assignee, reporter, priority, created/due dates and parent.
 */
const TaskDetailsModal = ({
  userRole,
  task,
  onClose,
  onDelete,
  onAddComment,
}: Properties) => {
  // Format date to a short human-readable string.
  // When there is no value, show "In progress" rather than a literal "None".
  // If parsing fails, fall back to the raw string.
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'In progress';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Simplify optional fields for clearer conditional rendering below.
  const assignee = task.assigneeId ? task.assigneeId : null;
  const reporter = task.reporterId ? task.reporterId : null;
  // Use lowercased type as a CSS class key (matches module CSS entries).
  const taskTypeClass = task.type.toLowerCase();

  // Local state used for composing a new comment. This keeps the UI
  // responsive even when a parent-provided `onAddComment` is async.
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddComment = async () => {
    const content = newComment.trim();
    if (!content) return;
    if (!onAddComment) {
      // No handler provided by parent — best-effort fallback.
      console.log('New comment:', content);
      setNewComment('');
      return;
    }
    try {
      setIsSubmitting(true);
      await onAddComment(content);
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Clicking the overlay closes the modal. The inner modal stops
    // propagation so clicks inside do not close it unintentionally.
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
                <div className={styles.status}>{task.status}</div>
                {/* Type badge styled by task type class */}
                <div className={`${styles.typeBadge} ${styles[taskTypeClass]}`}>
                  {task.type}
                </div>
              </div>
            </div>

            {/* Task description with sensible fallback */}
            <p className={styles.description}>
              {task.description || 'No description'}
            </p>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Activity</h3>
              <div className={styles.commentList}>
                {/* Render list of comments when present, otherwise a placeholder */}
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

              {/* Add-comment area: simple textarea + button placed at the
                  bottom of the activity column. When a parent supplies
                  `onAddComment`, it's called; otherwise the content is
                  logged as a best-effort fallback. */}
              <div className={styles.commentComposer}>
                <textarea
                  className={styles.commentInput}
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <div className={styles.commentActions}>
                  <button
                    type="button"
                    className={styles.addCommentButton}
                    onClick={handleAddComment}
                    disabled={isSubmitting || newComment.trim() === ''}
                  >
                    {isSubmitting ? 'Adding…' : 'Add comment'}
                  </button>
                </div>
              </div>
            </section>
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.sidebarCard}>
              <div className={styles.rowBetween}>
                <div>
                  <div className={styles.smallLabel}>Assignee</div>
                  {assignee ? (
                    <div
                      className={styles.assigneeRow}
                      title={`Assignee: ${assignee}`}
                    >
                      <div className={styles.avatarSmall}>
                        {assignee.slice(0, 2).toUpperCase()}
                      </div>
                      <div className={styles.assigneeName}>{assignee}</div>
                    </div>
                  ) : (
                    <div className={styles.detailValue}>Unassigned</div>
                  )}
                </div>
              </div>

              <div className={styles.rowBetween}>
                <div>
                  <div className={styles.smallLabel}>Reporter</div>
                  {reporter ? (
                    <div
                      className={styles.assigneeRow}
                      title={`Reporter: ${reporter}`}
                    >
                      <div className={styles.avatarSmall}>
                        {reporter.slice(0, 2).toUpperCase()}
                      </div>
                      <div className={styles.assigneeName}>{reporter}</div>
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
                <div className={styles.detailLabel}>Created on</div>
                <div className={styles.detailValue}>
                  {formatDate(task.createdAt)}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Updated on</div>
                <div className={styles.detailValue}>
                  {formatDate(task.updatedAt)}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Due date</div>
                <div className={styles.detailValue}>
                  {formatDate(task.dueDate)}
                </div>
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
              {/* Only show delete button when user has sufficient role and a
                  delete handler is provided. The parent component handles
                  any error reporting for deletions. */}
              {userRole !== 'PROJECT_VIEWER' && onDelete && (
                <div style={{ marginTop: 12 }}>
                  <button
                    className={styles.deleteButton}
                    onClick={async () => {
                      const ok = window.confirm('Delete this task?');
                      if (!ok) return;
                      try {
                        await onDelete(task.id);
                      } catch {
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
