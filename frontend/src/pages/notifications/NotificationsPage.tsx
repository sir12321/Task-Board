import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout/Layout';
import { apiClient } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import type { Notification } from '../../types/Types';
import styles from './NotificationsPage.module.css';

const formatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const NotificationsPage = () => {
  const { setUser } = useAuth();
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
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      setUpdatingId(notificationId);
      await apiClient(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      const nextNotifications = notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification,
      );
      setNotifications(nextNotifications);
      syncNotificationsInUser(nextNotifications);
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
    const unreadNotifications = notifications.filter(
      (notification) => !notification.isRead,
    );
    if (unreadNotifications.length === 0) return;

    try {
      setUpdatingId('all');
      await Promise.all(
        unreadNotifications.map((notification) =>
          apiClient(`/notifications/${notification.id}/read`, {
            method: 'PATCH',
          }),
        ),
      );
      const nextNotifications = notifications.map((notification) => ({
        ...notification,
        isRead: true,
      }));
      setNotifications(nextNotifications);
      syncNotificationsInUser(nextNotifications);
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
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Notifications</h1>
            <p className={styles.subtitle}>
              {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
            </p>
          </div>
          <button
            className={styles.markAllButton}
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || updatingId === 'all'}
          >
            {updatingId === 'all' ? 'Marking...' : 'Mark all as read'}
          </button>
        </div>

        {loading && <div className={styles.loading}>Loading notifications...</div>}
        {error && !loading && <div className={styles.error}>{error}</div>}

        {!loading && !error && notifications.length === 0 && (
          <div className={styles.empty}>You do not have any notifications yet.</div>
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
                  <p className={styles.content}>{notification.content}</p>
                  <time className={styles.time}>
                    {formatter.format(new Date(notification.createdAt))}
                  </time>
                </div>
                <button
                  className={styles.markOneButton}
                  onClick={() => markAsRead(notification.id)}
                  disabled={notification.isRead || updatingId === notification.id}
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
    </Layout>
  );
};

export default NotificationsPage;
