import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Board, ProjectDetails } from '../../types/Types';
import { apiClient } from '../../utils/api';
import {
  notifyProjectsUpdated,
  subscribeToProjectsUpdated,
} from '../../utils/projectsEvents';
import { useAuth } from '../../context/AuthContext';
import ToastMessage from '../Feedback/ToastMessage';
import useTransientMessage from '../../hooks/useTransientMessage';
import styles from './ProjectBoardSelector.module.css';
import WorkflowEditor from '../Board/Board/WorkflowEditor';

const buildBoardPath = (projectId: string, boardId: string) =>
  `/projects/${projectId}/boards/${boardId}`;

const ProjectBoardSelector = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projectId, boardId } = useParams();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectDetails[]>([]);
  const [workflowBoard, setWorkflowBoard] = useState<Board | null>(null);
  const { message, showMessage } = useTransientMessage();
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    projectId ?? null,
  );
  const menuId = 'project-board-selector-menu';

  const fetchProjects = useCallback(async () => {
    try {
      const data: ProjectDetails[] = await apiClient('/projects');
      const activeProjects = data.filter((p) => !p.isArchived);
      setProjects(activeProjects);
      if (!expandedProjectId && activeProjects.length > 0) {
        setExpandedProjectId(activeProjects[0].id);
      }
    } catch {
      // No-op: some users may not have any accessible projects yet.
    }
  }, [expandedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    return subscribeToProjectsUpdated(() => {
      fetchProjects();
    });
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
      const createdBoard: Board = await apiClient(`/boards/${newBoard.id}`);

      await fetchProjects();
      notifyProjectsUpdated();
      setWorkflowBoard(createdBoard);

      handleSelectBoard(projectId, newBoard.id);
    } catch {
      showMessage('Failed to create board.');
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
        <div className={styles.projectBoardSelector}>
          <div className={`${styles.pbsToggle} ${styles.pbsPlaceholder}`}>
            <div className={styles.pbsLabel}>
              <div className={styles.pbsProject}>No Projects</div>
              <div className={styles.pbsBoard}>Create one to get started</div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={styles.projectBoardSelector}>
      {message && <ToastMessage message={message} />}
      <button
        type="button"
        className={styles.pbsToggle}
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`Selected project ${selected.project.name}, board ${selected.board?.name ?? 'none selected'}. Toggle board selector`}
      >
        <div className={styles.pbsLabel}>
          <div className={styles.pbsProject}>{selected.project.name}</div>
          <div className={styles.pbsBoard}>
            {selected.board?.name ?? 'Select a board'}
          </div>
        </div>
        <div className={styles.pbsCaret}>▾</div>
      </button>

      {open && (
        <div className={styles.pbsMenu} id={menuId} role="menu">
          {projects.map((project) => (
            <div key={project.id} className={styles.pbsProjectBlock}>
              <button
                type="button"
                className={`${styles.pbsProjectName} ${
                  project.id === selected.project.id ? styles.selected : ''
                }`}
                onClick={() => setExpandedProjectId(project.id)}
                aria-expanded={project.id === expandedProjectId}
                aria-controls={`project-boards-${project.id}`}
              >
                {project.name}
              </button>

              <div
                id={`project-boards-${project.id}`}
                className={`${styles.pbsBoards} ${
                  project.id === expandedProjectId
                    ? styles.expanded
                    : styles.collapsed
                }`}
              >
                {project.boards?.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`${styles.pbsBoardItem} ${
                      b.id === selected.board?.id &&
                      project.id === selected.project.id
                        ? styles.selected
                        : ''
                    }`}
                    onClick={() => handleSelectBoard(project.id, b.id)}
                    aria-label={`Open board ${b.name} in project ${project.name}`}
                  >
                    {b.name}
                  </button>
                ))}
                {canCreateBoard(project) && (
                  <button
                    type="button"
                    className={styles.pbsCreateBoardBtn}
                    onClick={() => handleCreateBoard(project.id)}
                    title="Create new board"
                    aria-label={`Create a new board in project ${project.name}`}
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
              className={styles.pbsCreateProjectBtn}
              onClick={handleCreateProject}
              title="Create new project"
              aria-label="Create a new project"
            >
              + New Project
            </button>
          )}
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
  );
};

export default ProjectBoardSelector;
