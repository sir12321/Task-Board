import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import BoardPage from './pages/BoardPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import AssignUsersPage from './pages/project-management/AssignUsersPage';
import CreateProjectPage from './pages/project-management/CreateProjectPage';
import EditProjectSettingsPage from './pages/project-management/EditProjectSettingsPage';
import ProjectManagementPage from './pages/project-management/ProjectManagementPage';
import ManageGlobalRolesPage from './pages/project-management/ManageGlobalRolesPage';
import UserSettingsPage from './pages/user-settings/UserSettingsPage';
import UploadImagePage from './pages/user-settings/UploadImagePage';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/boards/:boardId"
        element={
          <ProtectedRoute>
            <BoardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/project-management"
        element={
          <ProtectedRoute>
            <ProjectManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-project"
        element={
          <ProtectedRoute>
            <CreateProjectPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assign-users"
        element={
          <ProtectedRoute>
            <AssignUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/project-settings"
        element={
          <ProtectedRoute>
            <EditProjectSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/global-role-management"
        element={
          <ProtectedRoute>
            <ManageGlobalRolesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-settings"
        element={
          <ProtectedRoute>
            <UserSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-settings/avatar"
        element={
          <ProtectedRoute>
            <UploadImagePage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
