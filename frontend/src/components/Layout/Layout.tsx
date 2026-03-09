import type { ReactNode } from 'react';
import { useState } from 'react';
import Sidebar from './Sidebar';
import ProjectBoardSelector from './ProjectBoardSelector';
import './Layout.css';

interface Props {
  children: ReactNode;
}

const Layout = ({ children }: Props) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        toggle={() => setCollapsed(!collapsed)}
      />

      <div className="main">
        <header className="layout-header">
          <ProjectBoardSelector />
        </header>

        <div className="content">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
