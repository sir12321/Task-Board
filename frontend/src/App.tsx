import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import BoardPage from './pages/MockData/BoardPage';
import { defaultBoardPath } from './pages/MockData/BoardPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/board" element={<Navigate to={defaultBoardPath} replace />} />
      <Route path="/projects/:projectId/boards/:boardId" element={<BoardPage />} />
    </Routes>
  );
}

export default App;
