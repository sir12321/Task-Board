import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import type { Notification } from '../../types/Types';
import styles from './NotificationsView.module.css';
import { getRichTextPlainText, renderRichText } from '../../utils/richText';

const formatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const getNotificationHtml = (content: string) => renderRichText(content);

const getNotificationText = (content: string) =>
  getRichTextPlainText(getNotificationHtml(content))
    .replace(/\s+/g, ' ')
    .trim();

const NotificationsView = () => {
  const { user, setUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  const syncNotificationsInUser = useCallback(
    (nextNotifications: Notification[]) => {
      setUser((prev) =>
        prev ? { ...prev, notifications: nextNotifications } : prev,
      );
    },
    [setUser],
  );

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient('/notifications');
      setNotifications(data);
      syncNotificationsInUser(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load notifications.',
      );
    } finally {
      setLoading(false);
    }
  }, [syncNotificationsInUser]);

  useEffect(() => {
    setNotifications(user?.notifications ?? []);
    setLoading(false);
  }, [user?.notifications]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      setUpdatingId(notificationId);
      await apiClient(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      setNotifications((currentNotifications) => {
        const nextNotifications = currentNotifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification,
        );
        syncNotificationsInUser(nextNotifications);
        return nextNotifications;
      });
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to mark notification as read.',
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const markAllAsRead = async () => {
    if (!notifications.some((notification) => !notification.isRead)) return;

    try {
      setUpdatingId('all');
      const unreadNotificationIds = notifications
        .filter((notification) => !notification.isRead)
        .map((notification) => notification.id);

      await Promise.all(
        unreadNotificationIds.map((notificationId) =>
          apiClient(`/notifications/${notificationId}/read`, {
            method: 'PATCH',
          }),
        ),
      );
      setNotifications((currentNotifications) => {
        const nextNotifications = currentNotifications.map((notification) => ({
          ...notification,
          isRead: true,
        }));
        syncNotificationsInUser(nextNotifications);
        return nextNotifications;
      });
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to mark all notifications as read.',
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>
            {unreadCount} unread{' '}
            {unreadCount === 1 ? 'notification' : 'notifications'}
          </p>
        </div>
        <button
          className={styles.markAllButton}
          type="button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0 || updatingId === 'all'}
          aria-label="Mark all notifications as read"
        >
          {updatingId === 'all' ? 'Marking...' : 'Mark all as read'}
        </button>
      </div>

      {loading && (
        <div className={styles.loading} role="status" aria-live="polite">
          Loading notifications...
        </div>
      )}
      {error && !loading && (
        <div className={styles.error} role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div className={styles.empty}>
          You do not have any notifications yet.
        </div>
      )}

      {!loading && !error && notifications.length > 0 && (
        <div className={styles.list}>
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`${styles.card} ${
                notification.isRead ? styles.read : styles.unread
              }`}
            >
              <div className={styles.contentSection}>
                <div
                  className={styles.content}
                  dangerouslySetInnerHTML={{
                    __html: getNotificationHtml(notification.content),
                  }}
                />
                <time className={styles.time}>
                  {formatter.format(new Date(notification.createdAt))}
                </time>
              </div>
              <button
                className={styles.markOneButton}
                type="button"
                onClick={() => markAsRead(notification.id)}
                disabled={notification.isRead || updatingId === notification.id}
                aria-label={
                  notification.isRead
                    ? 'Notification already read'
                    : `Mark notification as read: ${getNotificationText(notification.content)}`
                }
              >
                {notification.isRead
                  ? 'Read'
                  : updatingId === notification.id
                    ? 'Marking...'
                    : 'Mark as read'}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsView;
