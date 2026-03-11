import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../utils/api';
import Layout from '../../components/Layout/Layout';
import type { ProjectDetails } from '../../types/Types';
import styles from './DashboardPage.module.css';

const DashboardPage = () => {
  const [projects, setProjects] = useState<ProjectDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const [addingBoardTo, setAddingBoardTo] = useState<string | null>(null);
  const [newBoardName, setNewBoardName] = useState('');

  const [view, setView] = useState<'active' | 'archived'>('active');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiClient('/projects');
        setProjects(data);
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
    } catch (error) {
      alert('Failed to update project. Please try again.');
      console.error('Archive toggle error:', error);
    }
  };

  const filteredProjects = projects.filter((project) =>
    view === 'active' ? !project.isArchived : !!project.isArchived,
  );

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      alert('Project name cannot be empty.');
      return;
    }

    try {
      const created = await apiClient('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
        }),
      });

      const safelyCreated = {
        ...created,
        userRole: created.userRole || 'PROJECT_ADMIN',
        boards: created.boards || [],
        members: created.members || [],
        isArchived: false,
      };
      setProjects((prev) => [...prev, safelyCreated]);
      setIsModalOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
    } catch (error) {
      alert('Failed to create project.');
      console.error('Project creation error:', error);
    }
  };

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
      setProjects((prev) =>
        prev.map((proj) =>
          proj.id === projectId
            ? { ...proj, boards: [...proj.boards, created] }
            : proj,
        ),
      );
      setAddingBoardTo(null);
      setNewBoardName('');
    } catch (error) {
      alert('Failed to add board.');
      console.error('Board addition error:', error);
    }
  };

  const handleBoardClick = (projectId: string, boardId: string) => {
    navigate(`/projects/${projectId}/boards/${boardId}`);
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
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Dashboard</h1>
            <button
              className={styles.createButton}
              onClick={() => setIsModalOpen(true)}
            >
              + New Project
            </button>
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
                  <button
                    className={styles.archiveBtn}
                    onClick={() =>
                      handleToggleArchive(project.id, !!project.isArchived)
                    }
                    title={project.isArchived ? 'Unarchive' : 'Archive'}
                  >
                    {project.isArchived ? '📁' : '📥'}
                  </button>
                  <span className={styles.roleBadge}>
                    {project.userRole.replace('PROJECT_', '')}
                  </span>
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
                  {addingBoardTo === project.id ? (
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
                  ) : (
                    <button
                      onClick={() => setAddingBoardTo(project.id)}
                      className={styles.addBoardTrigger}
                    >
                      + Add Board
                    </button>
                  )}
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

        {isModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h2>Create New Project</h2>
              <form onSubmit={handleCreateProject}>
                <div className={styles.formField}>
                  <label>Project Name</label>
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Mobile App"
                    required
                  />
                </div>
                <div className={styles.formField}>
                  <label>Description (Optional)</label>
                  <input
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Describe your project"
                  />
                </div>
                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DashboardPage;
