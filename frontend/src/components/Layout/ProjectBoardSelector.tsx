import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ProjectDetails } from '../../types/Types';
import { apiClient } from '../../utils/api';
import './ProjectBoardSelector.css';

const buildBoardPath = (projectId: string, boardId: string) =>
  `/projects/${projectId}/boards/${boardId}`;

const ProjectBoardSelector = () => {
  const navigate = useNavigate();
  const { projectId, boardId } = useParams();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectDetails[]>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    projectId ?? null,
  );

  const fetchProjects = useCallback(async () => {
    try {
      const data: ProjectDetails[] = await apiClient('/projects');
      setProjects(data);
      if (!expandedProjectId && data.length > 0) {
        setExpandedProjectId(data[0].id);
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

    const project = projectId
      ? projects.find((p) => p.id === projectId)
      : projects[0];
    if (!project) return null;

    const board = boardId
      ? project.boards.find((b) => b.id === boardId)
      : project.boards[0];
    if (!board) return null;

    return { project, board };
  }, [projectId, boardId, projects]);

  useEffect(() => {
    if (selected) {
      setExpandedProjectId(selected.project.id);
    }
  }, [selected]);

  const handleSelectBoard = (projectKey: string, boardKey: string): void => {
    setOpen(false);
    navigate(buildBoardPath(projectKey, boardKey));
  };

  if (!selected) {
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
          <div className="pbs-board">{selected.board.name}</div>
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
                      b.id === selected.board.id &&
                      project.id === selected.project.id
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => handleSelectBoard(project.id, b.id)}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectBoardSelector;
