import './Sidebar.css';
import type { UserSummary } from '../../types/Board';
import { useNavigate } from 'react-router-dom';

interface Props {
  collapsed: boolean;
  toggle: () => void;
  user: UserSummary;
}

const Sidebar = ({ collapsed, toggle, user }: Props) => {
  const navigate = useNavigate();
  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button className="collapse-btn" onClick={toggle}>
        {collapsed ? '→' : '←'}
      </button>

      {!collapsed && <h2 className="logo">TaskFlow</h2>}

      <nav>
        <div className="nav-item active">
          {!collapsed && <span className="label">Board</span>}
        </div>

        <div className="nav-item">
          {!collapsed && <span className="label">Projects</span>}
        </div>

        <div className="nav-item">
          {!collapsed && <span className="label">Notifications</span>}
        </div>

        <div className="nav-item">
          {!collapsed && <span className="label">Settings</span>}
        </div>
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

        <div className="nav-item logout" onClick={() => navigate('/login')}>
          <span className="icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              width="20"
              height="20"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m-3-3h8.25m0 0l-3-3m3 3l-3 3"
              />
            </svg>
          </span>
          {!collapsed && <span className="label">Logout</span>}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
