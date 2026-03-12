import './Sidebar.css';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button className="collapse-btn" onClick={toggle}>
        {collapsed ? '→' : '←'}
      </button>

      {!collapsed && <h2 className="logo">TaskFlow</h2>}

      <nav>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `nav-item nav-link dashboard-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="nav-icon">⌂</span>
          {!collapsed && <span className="label">Dashboard</span>}
        </NavLink>

        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `nav-item nav-link notifications-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="nav-icon">⦿</span>
          {!collapsed && <span className="label">Notifications</span>}
          {hasUnreadNotifications && (
            <span className="notification-badge">
              {`${unreadNotificationCount}`}
            </span>
          )}
        </NavLink>

        {user.globalRole === 'GLOBAL_ADMIN' && (
          <NavLink
            to="/create-project"
            className={({ isActive }) =>
              `nav-item nav-link projectCreate-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon">+</span>
            {!collapsed && <span className="label">Create Project</span>}
          </NavLink>
        )}

        {user.globalRole !== 'GLOBAL_ADMIN' && (
          <NavLink
            to="/assign-users"
            className={({ isActive }) =>
              `nav-item nav-link projectCreate-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon">⇄</span>
            {!collapsed && <span className="label">Assign Users</span>}
          </NavLink>
        )}

        <NavLink
          to="/project-settings"
          className={({ isActive }) =>
            `nav-item nav-link settings-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="nav-icon">⚙</span>
          {!collapsed && <span className="label">Project Settings</span>}
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="avatar">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" />
            ) : (
              user.name.slice(0, 2).toUpperCase()
            )}
          </div>

          {!collapsed && (
            <div className="user-meta">
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
            </div>
          )}
        </div>

        <div className="nav-item logout" onClick={handleLogout}>
          <span className="icon">↩</span>
          {!collapsed && <span className="label">Logout</span>}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
