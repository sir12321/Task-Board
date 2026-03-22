import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../utils/api';
import { notifyProjectsUpdated } from '../../utils/projectsEvents';
import Layout from '../../components/Layout/Layout';
import type { Board, ProjectDetails } from '../../types/Types';
import { useAuth } from '../../context/AuthContext';
import styles from './DashboardPage.module.css';
import WorkflowEditor from '../../components/Board/Board/WorkflowEditor';
import ToastMessage from '../../components/Feedback/ToastMessage';
import useTransientMessage from '../../hooks/useTransientMessage';

const DashboardPage = () => {
  const [projects, setProjects] = useState<ProjectDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [addingBoardTo, setAddingBoardTo] = useState<string | null>(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [workflowBoard, setWorkflowBoard] = useState<Board | null>(null);
  const { message, showMessage } = useTransientMessage();

  const [view, setView] = useState<'active' | 'archived'>('active');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiClient('/projects');
        setProjects(data);
      } catch {
        showMessage('Failed to load projects.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showMessage]);

  const handleToggleArchive = async (projectId: string, archived: boolean) => {
    try {
      await apiClient(`/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived: !archived }),
      });
      setProjects((prev) =>
        prev.map((proj) =>
          proj.id === projectId ? { ...proj, isArchived: !archived } : proj,
        ),
      );
      notifyProjectsUpdated();
    } catch {
      showMessage('Failed to update project. Please try again.');
    }
  };

  const filteredProjects = projects.filter((project) =>
    view === 'active' ? !project.isArchived : !!project.isArchived,
  );

  const handleAddBoard = async (projectId: string) => {
    if (!newBoardName.trim()) return;

    try {
      const created = await apiClient(`/boards`, {
        method: 'POST',
        body: JSON.stringify({
          name: newBoardName,
          projectId: projectId,
        }),
      });
      const createdBoard: Board = await apiClient(`/boards/${created.id}`);
      setProjects((prev) =>
        prev.map((proj) =>
          proj.id === projectId
            ? { ...proj, boards: [...proj.boards, created] }
            : proj,
        ),
      );
      notifyProjectsUpdated();
      setWorkflowBoard(createdBoard);
      setAddingBoardTo(null);
      setNewBoardName('');
    } catch {
      showMessage('Failed to add board.');
    }
  };

  const handleBoardClick = (projectId: string, boardId: string) => {
    navigate(`/projects/${projectId}/boards/${boardId}`);
  };

  const canCreateBoard = (project: ProjectDetails) => {
    return (
      user?.globalRole === 'GLOBAL_ADMIN' ||
      project.userRole === 'PROJECT_ADMIN'
    );
  };

  const canArchiveProject = (project: ProjectDetails) => {
    return (
      user?.globalRole === 'GLOBAL_ADMIN' ||
      project.userRole === 'PROJECT_ADMIN'
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.loading}>Loading projects...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      {message && <ToastMessage message={message} />}
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Dashboard</h1>
          </div>

          <div className={styles.tabContainer}>
            <button
              className={`${styles.tab} ${view === 'active' ? styles.activeTab : ''}`}
              onClick={() => setView('active')}
            >
              Active
            </button>
            <button
              className={`${styles.tab} ${view === 'archived' ? styles.activeTab : ''}`}
              onClick={() => setView('archived')}
            >
              Archived
            </button>
          </div>
        </div>

        <div className={styles.grid}>
          {filteredProjects.map((project) => (
            <div key={project.id} className={styles.projectCard}>
              <div className={styles.projectHeader}>
                <h2 className={styles.projectTitle}>{project.name}</h2>
                <div className={styles.projectActions}>
                  {canArchiveProject(project) && (
                    <button
                      className={styles.archiveBtn}
                      onClick={() =>
                        handleToggleArchive(project.id, !!project.isArchived)
                      }
                      title={project.isArchived ? 'Unarchive' : 'Archive'}
                    >
                      {project.isArchived ? 'Restore' : 'Archive'}
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.boardSection}>
                <h3 className={styles.sectionLabel}>Boards</h3>
                <div className={styles.boardList}>
                  {project.boards.map((board) => (
                    <button
                      key={board.id}
                      className={styles.boardButton}
                      onClick={() => handleBoardClick(project.id, board.id)}
                    >
                      <span className={styles.boardName}>{board.name}</span>
                    </button>
                  ))}
                  {canCreateBoard(project) && addingBoardTo === project.id ? (
                    <div className={styles.inlineForm}>
                      <input
                        autoFocus
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && handleAddBoard(project.id)
                        }
                        placeholder="New board name"
                        className={styles.inlineInput}
                      />
                      <div className={styles.inlineActions}>
                        <button
                          onClick={() => handleAddBoard(project.id)}
                          className={styles.addBtn}
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setAddingBoardTo(null)}
                          className={styles.cancelBtn}
                        >
                          x
                        </button>
                      </div>
                    </div>
                  ) : canCreateBoard(project) ? (
                    <button
                      onClick={() => setAddingBoardTo(project.id)}
                      className={styles.addBoardTrigger}
                    >
                      + Add Board
                    </button>
                  ) : null}
                  {project.boards.length === 0 && !addingBoardTo && (
                    <p className={styles.emptyText}>
                      No boards in this project.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>
              You are not part of any projects yet.
            </p>
          </div>
        )}

        {workflowBoard && (
          <WorkflowEditor
            title="Set board workflow"
            description="Choose which columns represent each workflow stage for the new board."
            columns={workflowBoard.columns}
            workflow={{
              storyColumnId: workflowBoard.storyColumnId,
              workflowColumnIds: workflowBoard.workflowColumnIds,
              resolvedColumnId: workflowBoard.resolvedColumnId,
              closedColumnId: workflowBoard.closedColumnId,
            }}
            onSubmit={async (workflow) => {
              await apiClient(`/boards/${workflowBoard.id}/workflow`, {
                method: 'PUT',
                body: JSON.stringify(workflow),
              });
            }}
            onCancel={() => setWorkflowBoard(null)}
            setShortError={(message) => {
              if (message) alert(message);
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default DashboardPage;
