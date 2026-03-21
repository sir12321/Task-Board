import styles from './Sidebar.module.css';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/getInitials';

interface Props {
  collapsed: boolean;
  toggle: () => void;
}

const Sidebar = ({ collapsed, toggle }: Props) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const unreadNotificationCount =
    user?.notifications.filter((notification) => !notification.isRead).length ??
    0;
  const hasUnreadNotifications = unreadNotificationCount > 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <button className={styles.collapseBtn} onClick={toggle}>
        {collapsed ? '→' : '←'}
      </button>

      {!collapsed && <h2 className={styles.logo}>TaskFlow</h2>}

      <nav className={styles.nav}>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `${styles.navItem} ${styles.navLink} ${styles.dashboardItem} ${
              isActive ? styles.active : ''
            }`
          }
        >
          <span className={styles.navIcon}>⌂</span>
          {!collapsed && <span className={styles.label}>Dashboard</span>}
        </NavLink>

        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `${styles.navItem} ${styles.navLink} ${styles.notificationsItem} ${
              isActive ? styles.active : ''
            }`
          }
        >
          <span className={styles.navIcon}>⦿</span>
          {!collapsed && <span className={styles.label}>Notifications</span>}
          {hasUnreadNotifications && (
            <span className={styles.notificationBadge}>
              {`${unreadNotificationCount}`}
            </span>
          )}
        </NavLink>

        {user.globalRole === 'GLOBAL_ADMIN' && (
          <NavLink
            to="/create-project"
            className={({ isActive }) =>
              `${styles.navItem} ${styles.navLink} ${styles.projectCreateItem} ${
                isActive ? styles.active : ''
              }`
            }
          >
            <span className={styles.navIcon}>+</span>
            {!collapsed && <span className={styles.label}>Create Project</span>}
          </NavLink>
        )}

        {user.globalRole === 'GLOBAL_ADMIN' && (
          <NavLink
            to="/global-role-management"
            className={({ isActive }) =>
              `${styles.navItem} ${styles.navLink} ${styles.projectCreateItem} ${
                isActive ? styles.active : ''
              }`
            }
          >
            <span className={styles.navIcon}>♛</span>
            {!collapsed && (
              <span className={styles.label}>Global Role Access</span>
            )}
          </NavLink>
        )}

        {user.globalRole !== 'GLOBAL_ADMIN' && (
          <NavLink
            to="/assign-users"
            className={({ isActive }) =>
              `${styles.navItem} ${styles.navLink} ${styles.projectCreateItem} ${
                isActive ? styles.active : ''
              }`
            }
          >
            <span className={styles.navIcon}>⇄</span>
            {!collapsed && <span className={styles.label}>Assign Users</span>}
          </NavLink>
        )}

        <NavLink
          to="/project-settings"
          className={({ isActive }) =>
            `${styles.navItem} ${styles.navLink} ${styles.settingsItem} ${
              isActive ? styles.active : ''
            }`
          }
        >
          <span className={styles.navIcon}>⚙</span>
          {!collapsed && <span className={styles.label}>Project Settings</span>}
        </NavLink>
      </nav>

      <div className={styles.sidebarFooter}>
        <div
          className={styles.userInfo}
          onClick={() => navigate('/user-settings')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/user-settings');
            }
          }}
        >
          <div className={styles.avatar}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" />
            ) : (
              getInitials(user.name)
            )}
          </div>

          {!collapsed && (
            <div className={styles.userMeta}>
              <div className={styles.userName}>{user.name}</div>
              <div className={styles.userEmail}>{user.email}</div>
            </div>
          )}
        </div>

        <div
          className={`${styles.navItem} ${styles.logout}`}
          onClick={handleLogout}
        >
          <span className={styles.icon}>↩</span>
          {!collapsed && <span className={styles.label}>Logout</span>}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
