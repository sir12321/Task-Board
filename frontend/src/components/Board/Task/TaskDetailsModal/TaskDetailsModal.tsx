import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ProjectMemberSummary,
  Task,
  ProjectRole,
  AuditLog,
  TimeLineComment,
  TimeLineAuditLog,
  TimeLineItem,
} from '../../../../types/Types';
import styles from './TaskDetailsModal.module.css';
import { apiClient } from '../../../../utils/api';
import ToastMessage from '../../../Feedback/ToastMessage';
import useTransientMessage from '../../../../hooks/useTransientMessage';
import { TaskActivityFeed } from './TaskActivityFeed';
import { TaskSidebar } from './TaskSidebar';
import {
  TaskCommentComposer,
  type TaskCommentComposerHandle,
} from './TaskCommentComposer';

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
  projectMembers: ProjectMemberSummary[];
  mentionableMembers?: ProjectMemberSummary[];
  currentUserId?: string | null;
  currentUserGlobalRole?: string;
  onClose: () => void;
  onAddComment?: (content: string) => Promise<void> | void;
  onEditComment?: (
    commentId: string,
    newContent: string,
  ) => Promise<void> | void;
  onDeleteComment?: (commentId: string) => Promise<void> | void;
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
  projectMembers,
  mentionableMembers,
  currentUserId,
  currentUserGlobalRole,
  onClose,

  onAddComment,
  onDeleteComment,
  onEditComment,
}: Properties) => {
  const composerRef = useRef<TaskCommentComposerHandle>(null);

  // Use lowercased type as a CSS class key (matches module CSS entries).
  const taskTypeClass = task.type.toLowerCase();

  const commentDeleteWindowMs = 2 * 24 * 60 * 60 * 1000;
  const commentEditWindowMs = 2 * 24 * 60 * 60 * 1000 * 3;
  const mentionSourceMembers = mentionableMembers ?? projectMembers;

  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<
    string | null
  >(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const { message, showMessage } = useTransientMessage();

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(task.auditLogs || []);

  useEffect(() => {
    let isMounted = true;
    const fetchTaskDetails = async () => {
      try {
        const data = await apiClient(`/tasks/${task.id}`);
        if (isMounted && data.auditLogs) {
          setAuditLogs(data.auditLogs);
        }
      } catch {
        showMessage('Failed to load task activity.');
      }
    };

    void fetchTaskDetails();

    return () => {
      isMounted = false;
    };
  }, [showMessage, task.id, task.updatedAt, task.comments?.length]);

  const timelineItems = useMemo<TimeLineItem[]>(() => {
    const comments: TimeLineComment[] = (task.comments || []).map(
      (comment) => ({
        ...comment,
        timelineType: 'COMMENT',
        timestampMs: new Date(comment.createdAt).getTime(),
      }),
    );

    const logs: TimeLineAuditLog[] = auditLogs
      .filter((log) => log.action !== 'COMMENT_ADDED')
      .map((log) => ({
        ...log,
        timelineType: 'AUDIT_LOG',
        timestampMs: new Date(log.timestamp).getTime(),
      }));

    return [...comments, ...logs].sort((a, b) => a.timestampMs - b.timestampMs);
  }, [task.comments, auditLogs]);

  const handleEditComment = (id: string, content: string) => {
    composerRef.current?.startEditing(id, content);
  };

  const handleModalClose = () => {
    composerRef.current?.reset(true);
    setPendingDeleteCommentId(null);
    setIsDeletingComment(false);
    onClose();
  };

  const requestCommentDelete = (commentId: string) => {
    setPendingDeleteCommentId(commentId);
  };

  const closeCommentDeleteConfirm = () => {
    if (isDeletingComment) {
      return;
    }

    setPendingDeleteCommentId(null);
  };

  const confirmCommentDelete = async () => {
    if (!pendingDeleteCommentId || !onDeleteComment) {
      return;
    }

    try {
      setIsDeletingComment(true);
      await onDeleteComment(pendingDeleteCommentId);
      setPendingDeleteCommentId(null);
    } catch {
      showMessage('Failed to delete comment.');
    } finally {
      setIsDeletingComment(false);
    }
  };

  return (
    // Clicking the overlay closes the modal. The inner modal stops
    // propagation so clicks inside do not close it unintentionally.
    <div className={styles['overall-modal']} onClick={handleModalClose}>
      {message && <ToastMessage message={message} />}
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles['close-btn']} onClick={handleModalClose}>
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
                <TaskActivityFeed
                  timelineItems={timelineItems}
                  currentUserId={currentUserId}
                  currentUserGlobalRole={currentUserGlobalRole}
                  projectMembers={projectMembers}
                  commentDeleteWindowMs={commentDeleteWindowMs}
                  commentEditWindowMs={commentEditWindowMs}
                  onDeleteComment={onDeleteComment}
                  onEditComment={onEditComment}
                  requestCommentDelete={requestCommentDelete}
                  handleEditComment={handleEditComment}
                />
              </div>

              {userRole !== 'PROJECT_VIEWER' && (
                <TaskCommentComposer
                  ref={composerRef}
                  mentionSourceMembers={mentionSourceMembers}
                  onAddComment={onAddComment}
                  onEditComment={onEditComment}
                  showMessage={showMessage}
                />
              )}
            </section>
          </div>

          <TaskSidebar task={task} />
        </div>

        {pendingDeleteCommentId && (
          <div
            className={styles.confirmOverlay}
            onClick={closeCommentDeleteConfirm}
          >
            <div
              className={styles.confirmCard}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-comment-title"
            >
              <h4 id="delete-comment-title" className={styles.confirmTitle}>
                Delete comment?
              </h4>
              <p className={styles.confirmText}>
                This action cannot be undone.
              </p>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className={styles.confirmCancelButton}
                  onClick={closeCommentDeleteConfirm}
                  disabled={isDeletingComment}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.confirmDeleteButton}
                  onClick={() => {
                    void confirmCommentDelete();
                  }}
                  disabled={isDeletingComment}
                >
                  {isDeletingComment ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetailsModal;
