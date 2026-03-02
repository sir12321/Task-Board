import type { ReactNode } from 'react';
import { useState } from 'react';
import Sidebar from './Sidebar';
import './Layout.css';

interface Props {
  children: ReactNode;
}

const Layout = ({ children }: Props) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} />
      <div className="content">{children}</div>
    </div>
  );
};

export default Layout;
