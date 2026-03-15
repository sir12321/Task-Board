import type { ReactNode } from 'react';
import { useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ProjectBoardSelector from './ProjectBoardSelector';
import styles from './Layout.module.css';

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
    <div className={`${styles.layout} ${collapsed ? styles.collapsed : ''}`}>
      <Sidebar collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} />

      <div className={styles.main}>
        {showProjectBoardSelector && (
          <header className={styles.layoutHeader}>
            <div className={styles.selectorWrap}>
              <ProjectBoardSelector />
            </div>
          </header>
        )}

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
};

export default Layout;
