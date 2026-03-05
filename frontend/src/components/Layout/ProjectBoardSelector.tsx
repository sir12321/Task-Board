import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  mockProjects,
  buildBoardPath,
  defaultBoardId,
  defaultProjectId,
  createBoardForProject,
  updateProjectSettings,
  resolveProjectBoardSelection,
} from '../../pages/MockData';
import './ProjectBoardSelector.css';

const ProjectBoardSelector = () => {
  const navigate = useNavigate();
  const { projectId, boardId } = useParams();
  const [open, setOpen] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState(
    projectId ?? defaultProjectId,
  );

  const selected = useMemo(() => {
    if (!projectId || !boardId) {
      return resolveProjectBoardSelection(defaultProjectId, defaultBoardId);
    }
    return (
      resolveProjectBoardSelection(projectId, boardId) ??
      resolveProjectBoardSelection(defaultProjectId, defaultBoardId)
    );
  }, [projectId, boardId]);

  useEffect(() => {
    if (!selected) {
      return;
    }
    setExpandedProjectId(selected.project.id);
  }, [selected]);

  const handleSelectBoard = (projectKey: string, boardKey: string): void => {
    setOpen(false);
    navigate(buildBoardPath(projectKey, boardKey));
  };

  const handleCreateBoard = (projectKey: string): void => {
    const project = mockProjects.find((p) => p.id === projectKey);
    if (!project || project.userRole !== 'PROJECT_ADMIN') {
      alert('Only ProjectAdmin can create a board.');
      return;
    }

    const boardName = window.prompt('Enter board name');
    if (boardName === null) {
      return;
    }

    const createdBoard = createBoardForProject(projectKey, boardName);
    if (!createdBoard) {
      alert('Board creation failed. Please provide a valid board name.');
      return;
    }

    setExpandedProjectId(projectKey);
    setOpen(false);
    navigate(buildBoardPath(projectKey, createdBoard.id));
  };

  const handleEditProjectSettings = (projectKey: string): void => {
    const project = mockProjects.find((p) => p.id === projectKey);
    if (!project || project.userRole !== 'PROJECT_ADMIN') {
      alert('Only ProjectAdmin can edit project settings.');
      return;
    }

    const projectName = window.prompt('Project name', project.name);
    if (projectName === null) {
      return;
    }

    const projectDescription = window.prompt(
      'Project description',
      project.description ?? '',
    );
    if (projectDescription === null) {
      return;
    }

    const updatedProject = updateProjectSettings(projectKey, {
      name: projectName,
      description: projectDescription,
    });

    if (!updatedProject) {
      alert('Project settings update failed. Name cannot be empty.');
      return;
    }

    setOpen(false);
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
          {mockProjects.map((project) => (
            <div key={project.id} className="pbs-project-block">
              <div
                className={`pbs-project-name ${
                  project.id === selected.project.id ? 'selected' : ''
                }`}
                onClick={() => setExpandedProjectId(project.id)}
              >
                {project.name}
              </div>
              {project.userRole === 'PROJECT_ADMIN' && (
                <button
                  type="button"
                  className="pbs-project-settings"
                  onClick={() => handleEditProjectSettings(project.id)}
                >
                  Edit Project Settings
                </button>
              )}

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
                {project.userRole === 'PROJECT_ADMIN' && (
                  <button
                    type="button"
                    className="pbs-create-board"
                    onClick={() => handleCreateBoard(project.id)}
                  >
                    + Create New Board
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectBoardSelector;
