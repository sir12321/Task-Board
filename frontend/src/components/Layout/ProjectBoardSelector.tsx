import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ProjectDetails } from '../../types/Types';
import { apiClient } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './ProjectBoardSelector.css';

const buildBoardPath = (projectId: string, boardId: string) =>
  `/projects/${projectId}/boards/${boardId}`;

const ProjectBoardSelector = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projectId, boardId } = useParams();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectDetails[]>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    projectId ?? null,
  );

  const fetchProjects = useCallback(async () => {
    try {
      const data: ProjectDetails[] = await apiClient('/projects');
      const activeProjects = data.filter((p) => !p.isArchived);
      setProjects(activeProjects);
      if (!expandedProjectId && activeProjects.length > 0) {
        setExpandedProjectId(activeProjects[0].id);
      }
    } catch {
      // silently fail — user may not have projects
    }
  }, [expandedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const selected = useMemo(() => {
    if (projects.length === 0) return null;

    const routeProject = projectId
      ? projects.find((p) => p.id === projectId)
      : undefined;
    const project = routeProject ?? projects[0];

    const board = boardId
      ? project.boards.find((b) => b.id === boardId)
      : project.boards[0];

    return { project, board: board ?? null };
  }, [projectId, boardId, projects]);

  useEffect(() => {
    if (selected && !expandedProjectId) {
      setExpandedProjectId(selected.project.id);
    }
  }, [selected, expandedProjectId]);

  const handleSelectBoard = (projectKey: string, boardKey: string): void => {
    setOpen(false);
    navigate(buildBoardPath(projectKey, boardKey));
  };

  const handleCreateProject = (): void => {
    setOpen(false);
    navigate('/create-project');
  };

  const handleCreateBoard = async (projectId: string): Promise<void> => {
    const boardName = prompt('Enter board name:');
    if (!boardName) return;

    try {
      const newBoard = await apiClient('/boards', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          name: boardName,
        }),
      });

      await fetchProjects();
      
      handleSelectBoard(projectId, newBoard.id);
    } catch (error) {
      console.error('Failed to create board:', error);
      alert('Failed to create board');
    }
  };

  const canCreateBoard = (project: ProjectDetails): boolean => {
    return (
      user?.globalRole === 'GLOBAL_ADMIN' ||
      project.userRole === 'PROJECT_ADMIN'
    );
  };

  if (!selected) {
    if (projects.length === 0) {
      return (
        <div className="project-board-selector">
          <div className="pbs-toggle pbs-placeholder">
            <div className="pbs-label">
              <div className="pbs-project">No Projects</div>
              <div className="pbs-board">Create one to get started</div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="project-board-selector">
      <button
        type="button"
        className="pbs-toggle"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
      >
        <div className="pbs-label">
          <div className="pbs-project">{selected.project.name}</div>
            <div className="pbs-board">{selected.board?.name ?? 'Select a board'}</div>
        </div>
        <div className="pbs-caret">▾</div>
      </button>

      {open && (
        <div className="pbs-menu">
          {projects.map((project) => (
            <div key={project.id} className="pbs-project-block">
              <div
                className={`pbs-project-name ${
                  project.id === selected.project.id ? 'selected' : ''
                }`}
                onClick={() => setExpandedProjectId(project.id)}
              >
                {project.name}
              </div>

              <div
                className={`pbs-boards ${
                  project.id === expandedProjectId ? 'expanded' : 'collapsed'
                }`}
              >
                {project.boards?.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`pbs-board-item ${
                      b.id === selected.board?.id &&
                      project.id === selected.project.id
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => handleSelectBoard(project.id, b.id)}
                  >
                    {b.name}
                  </button>
                ))}
                {canCreateBoard(project) && (
                  <button
                    type="button"
                    className="pbs-create-board-btn"
                    onClick={() => handleCreateBoard(project.id)}
                    title="Create new board"
                  >
                    + New Board
                  </button>
                )}
              </div>
            </div>
          ))}

          {user?.globalRole === 'GLOBAL_ADMIN' && (
            <button
              type="button"
              className="pbs-create-project-btn"
              onClick={handleCreateProject}
              title="Create new project"
            >
              + New Project
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectBoardSelector;
