import type { ReactNode } from 'react';
import { useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ProjectBoardSelector from './ProjectBoardSelector';
import './Layout.css';

interface Props {
  children: ReactNode;
}

const Layout = ({ children }: Props) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const showProjectBoardSelector =
    location.pathname === '/dashboard' ||
    location.pathname === '/assign-users' ||
    Boolean(
      matchPath('/projects/:projectId/boards/:boardId', location.pathname),
    );

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        toggle={() => setCollapsed(!collapsed)}
      />

      <div className="main">
        {showProjectBoardSelector && (
          <header className="layout-header">
            <ProjectBoardSelector />
          </header>
        )}

        <div className="content">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
