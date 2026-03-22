import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import BoardView from '../../components/Board/Board/Board';
import { useAuth } from '../../context/AuthContext';
import ToastMessage from '../../components/Feedback/ToastMessage';
import useTransientMessage from '../../hooks/useTransientMessage';
import { useBoardData } from './useBoardData';

export default function BoardPage() {
  const { projectId, boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { message, showMessage } = useTransientMessage();

  const {
    board,
    project,
    loading,
    deleteTask,
    createTask,
    updateTask,
    addComment,
    editComment,
    deleteComment,
    addColumn,
    renameColumn,
    reorderColumn,
    updateColumnWip,
    deleteColumn,
    updateWorkflow,
  } = useBoardData(projectId, boardId, user, navigate, showMessage);

  if (loading && !board) {
    return (
      <Layout>
        <div style={{ padding: '20px' }}>Loading board...</div>
      </Layout>
    );
  }

  if (!board || !project) {
    return (
      <Layout>
        {message && <ToastMessage message={message} />}
        <div style={{ padding: '20px' }}>No project/board data found.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      {message && <ToastMessage message={message} />}
      <div
        style={{
          opacity: loading ? 0.75 : 1,
          transition: 'opacity 180ms ease',
        }}
      >
        {loading && board && (
          <div
            style={{
              padding: '8px 20px 0',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            Updating board...
          </div>
        )}
        <BoardView
          key={`${project.id}:${board.id}`}
          board={board}
          projectDetails={project}
          onDeleteTask={deleteTask}
          onCreateTask={createTask}
          onUpdateTask={updateTask}
          onAddComment={addComment}
          onEditComment={editComment}
          onDeleteComment={deleteComment}
          onAddColumn={addColumn}
          onRenameColumn={renameColumn}
          onReorderColumn={reorderColumn}
          onUpdateColumnWip={updateColumnWip}
          onDeleteColumn={deleteColumn}
          onUpdateWorkflow={updateWorkflow}
        />
      </div>
    </Layout>
  );
}
