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
  currentUserId?: string | null;
  onClose: () => void;
  onDelete?: (taskId: string) => Promise<void> | void;
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
  currentUserId,
  onClose,
  onDelete,
  onAddComment,
}: Properties) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'In progress';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const assigneeName = task.assigneeName || 'Unassigned';
  const reporterName = task.reporterName || 'Unassigned';
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
      // to be removed in future when onAddComment is guaranteed to be provided
      console.log('New comment:', content);
      setNewComment('');
      return;
    }
    try {
      setIsSubmitting(true);
      await onAddComment(content);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Clicking the overlay closes the modal. The inner modal stops
    // propagation so clicks inside do not close it unintentionally.
    <div className={styles['overall-modal']} onClick={onClose}>
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
                {task.comments && task.comments.length > 0 ? (
                  task.comments.map((c) => {
                    const isMine = c.authorId === currentUserId;
                    return (
                      <div
                        className={`${styles.comment} ${
                          isMine ? styles.commentMine : ''
                        }`}
                        key={c.id}
                      >
                        <div className={styles.commentAvatar}>
                          {c.authorName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className={styles.commentBody}>
                          <div className={styles.commentMeta}>
                            <strong>{c.authorName}</strong> · {/*bold*/}
                            <span className={styles.commentTime}>
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className={styles.commentText}>{c.content}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.activityPlaceholder}>
                    No comments yet.
                  </div>
                )}
              </div>

              {userRole !== 'PROJECT_VIEWER' && (
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
              )}
            </section>
          </div>

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
                        {assigneeName.slice(0, 2).toUpperCase()}
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
                        {reporterName.slice(0, 2).toUpperCase()}
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
                  {task.parentName || 'None'}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Activity</div>
                <div className={styles.detailValue}>
                  {task.comments ? task.comments.length : 0}
                </div>
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
                        onClose();
                      } catch (error) {
                        console.error('Failed to delete task:', error);
                      }
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
