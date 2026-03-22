import { useState, useEffect, useCallback } from 'react';
import type { AuthUser, Board, ProjectDetails } from '../../types/Types';
import type { NavigateFunction } from 'react-router-dom';
import { apiClient } from '../../utils/api';
import { getTaskStatus } from '../../components/Board/Board/workflow';
import { useBoardTasks } from './useBoardTasks';
import { useBoardComments } from './useBoardComments';
import { useBoardColumns } from './useBoardColumns';

export function useBoardData(
  projectId: string | undefined,
  boardId: string | undefined,
  user: AuthUser | null,
  navigate: NavigateFunction,
  showMessage: (msg: string) => void,
) {
  const [board, setBoard] = useState<Board | null>(null);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const withRecomputedStatuses = useCallback((nextBoard: Board): Board => {
    return {
      ...nextBoard,
      tasks: nextBoard.tasks.map((task) => ({
        ...task,
        status: getTaskStatus(nextBoard, task),
      })),
    };
  }, []);

  const updateBoardState = useCallback(
    (updater: (currentBoard: Board) => Board) => {
      setBoard((currentBoard) => {
        if (!currentBoard) return currentBoard;
        return withRecomputedStatuses(updater(currentBoard));
      });
    },
    [withRecomputedStatuses],
  );

  const hydrateBoardAvatars = useCallback(
    (rawBoard: Board, projectDetails: ProjectDetails): Board => {
      const memberById = new Map(
        projectDetails.members.map((member) => [member.id, member]),
      );

      return {
        ...rawBoard,
        tasks: rawBoard.tasks.map((task) => {
          const assigneeMember = task.assigneeId
            ? memberById.get(task.assigneeId)
            : undefined;
          const reporterMember = memberById.get(task.reporterId);

          return {
            ...task,
            assigneeAvatarUrl:
              task.assigneeAvatarUrl ?? assigneeMember?.avatarUrl ?? null,
            reporterAvatarUrl:
              task.reporterAvatarUrl ??
              reporterMember?.avatarUrl ??
              (task.reporterId === user?.id ? user.avatarUrl : null) ??
              null,
            comments: task.comments?.map((comment) => {
              const authorMember = memberById.get(comment.authorId);

              return {
                ...comment,
                authorAvatarUrl:
                  comment.authorAvatarUrl ??
                  authorMember?.avatarUrl ??
                  (comment.authorId === user?.id ? user.avatarUrl : null) ??
                  null,
              };
            }),
          };
        }),
      };
    },
    [user?.avatarUrl, user?.id],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const projects: ProjectDetails[] = await apiClient('/projects');
        if (cancelled || projects.length === 0) {
          setLoading(false);
          return;
        }

        let resolvedProject = projectId
          ? projects.find((p) => p.id === projectId)
          : projects[0];
        if (!resolvedProject) resolvedProject = projects[0];

        let resolvedBoardId = boardId;
        if (
          !resolvedBoardId ||
          !resolvedProject.boards.find((b) => b.id === resolvedBoardId)
        ) {
          resolvedBoardId = resolvedProject.boards[0]?.id;
        }

        if (!resolvedBoardId) {
          setProject(resolvedProject);
          setBoard(null);
          setLoading(false);
          return;
        }

        if (resolvedProject.id !== projectId || resolvedBoardId !== boardId) {
          navigate(
            `/projects/${resolvedProject.id}/boards/${resolvedBoardId}`,
            { replace: true },
          );
          return;
        }

        const boardData: Board = await apiClient(`/boards/${resolvedBoardId}`);
        if (!cancelled) {
          setProject(resolvedProject);
          setBoard(hydrateBoardAvatars(boardData, resolvedProject));
        }
      } catch {
        showMessage('Failed to load board.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [projectId, boardId, navigate, hydrateBoardAvatars, showMessage]);

  const { deleteTask, createTask, updateTask } = useBoardTasks(
    board,
    project,
    updateBoardState,
    setBoard,
    user,
  );

  const { addComment, editComment, deleteComment } = useBoardComments(
    board,
    project,
    setBoard,
    showMessage,
    user,
  );

  const {
    addColumn,
    renameColumn,
    reorderColumn,
    updateColumnWip,
    deleteColumn,
    updateWorkflow,
  } = useBoardColumns(
    board,
    project,
    updateBoardState,
    setBoard,
    showMessage,
    user,
  );

  return {
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
  };
}
