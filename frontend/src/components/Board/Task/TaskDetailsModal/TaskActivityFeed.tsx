import { getInitials } from '../../../../utils/getInitials';
import {
  getRichTextPlainText,
  renderRichText,
} from '../../../../utils/richText';
import type {
  TimeLineItem,
  ProjectMemberSummary,
} from '../../../../types/Types';
import styles from './TaskDetailsModal.module.css';

const getAuditActionLabel = (action: string): string => {
  if (action === 'STATUS_CHANGED') return 'changed status';
  if (action === 'ASSIGNEE_CHANGED') return 'changed assignee';
  if (action === 'CREATED') return 'created this task';
  if (action === 'COMMENT_ADDED') return 'added a comment';
  if (action === 'COMMENT_EDITED') return 'edited a comment';
  if (action === 'COMMENT_DELETED') return 'deleted a comment';

  return action.replace(/_/g, ' ').toLowerCase();
};

const formatAuditValue = (value: string | null | undefined, action: string) => {
  if (!value) {
    return 'None';
  }

  const normalized = action.startsWith('COMMENT_')
    ? getRichTextPlainText(value)
    : value;
  const compact = normalized.replace(/\s+/g, ' ').trim();

  if (!compact) {
    return 'None';
  }

  if (compact.length > 120) {
    return `${compact.slice(0, 120).trimEnd()}...`;
  }

  return compact;
};

interface TaskActivityFeedProps {
  timelineItems: TimeLineItem[];
  currentUserId?: string | null;
  currentUserGlobalRole?: string;
  projectMembers: ProjectMemberSummary[];
  commentDeleteWindowMs: number;
  commentEditWindowMs: number;
  onDeleteComment?: (commentId: string) => Promise<void> | void;
  onEditComment?: (
    commentId: string,
    newContent: string,
  ) => Promise<void> | void;
  requestCommentDelete: (commentId: string) => void;
  handleEditComment?: (id: string, content: string) => void;
}

export const TaskActivityFeed = ({
  timelineItems,
  currentUserId,
  currentUserGlobalRole,
  projectMembers,
  commentDeleteWindowMs,
  commentEditWindowMs,
  onDeleteComment,
  onEditComment,
  requestCommentDelete,
  handleEditComment,
}: TaskActivityFeedProps) => {
  if (timelineItems.length === 0) {
    return <div className={styles.activityPlaceholder}>No activity yet.</div>;
  }

  return (
    <>
      {timelineItems.map((item) => {
        if (item.timelineType === 'COMMENT') {
          const isMine = item.authorId === currentUserId;
          const isGlobalAdmin = currentUserGlobalRole === 'GLOBAL_ADMIN';
          const isWithinDeleteWindow =
            Number.isFinite(item.timestampMs) &&
            Date.now() - item.timestampMs <= commentDeleteWindowMs;
          const isWithinEditWindow =
            Number.isFinite(item.timestampMs) &&
            Date.now() - item.timestampMs <= commentEditWindowMs;
          const canDelete =
            Boolean(onDeleteComment) &&
            (isGlobalAdmin || (isMine && isWithinDeleteWindow));
          const canEdit =
            Boolean(onEditComment) &&
            (isGlobalAdmin || (isMine && isWithinEditWindow));

          return (
            <div
              className={`${styles.comment} ${
                isMine ? styles.commentMine : ''
              }`}
              key={`comment-${item.id}`}
            >
              <div className={styles.commentAvatar}>
                {item.authorAvatarUrl ? (
                  <img src={item.authorAvatarUrl} alt={item.authorName} />
                ) : (
                  getInitials(item.authorName)
                )}
              </div>
              <div className={styles.commentBody}>
                <div className={styles.commentMeta}>
                  <strong>{item.authorName}</strong>
                  <span className={styles.commentTimestamp}>
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      className={styles.deleteCommentButton}
                      onClick={() => requestCommentDelete(item.id)}
                    >
                      Delete
                    </button>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      className={styles.editCommentButton}
                      onClick={() => handleEditComment?.(item.id, item.content)}
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div
                  className={styles.commentText}
                  dangerouslySetInnerHTML={{
                    __html: renderRichText(item.content, projectMembers),
                  }}
                />
              </div>
            </div>
          );
        }

        return (
          <div className={styles.auditLog} key={`audit-${item.id}`}>
            <div className={styles.auditLogDot} />
            <div className={styles.auditLogContent}>
              <strong>{item.user?.name || 'Unknown User'}</strong>{' '}
              <span className={styles.auditLogAction}>
                {getAuditActionLabel(item.action)}
              </span>{' '}
              {item.action !== 'COMMENT_DELETED' &&
                (item.oldValue || item.newValue) && (
                  <span className={styles.auditLogDetails}>
                    ({formatAuditValue(item.oldValue, item.action)} &rarr;{' '}
                    {formatAuditValue(item.newValue, item.action)})
                  </span>
                )}
              <span className={styles.commentTimestamp}>
                {' '}
                · {new Date(item.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
};
