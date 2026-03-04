import type {
  User,
  ProjectDetails,
  Board,
  BoardColumn,
  Task,
} from '../../types/Types';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import BoardView from '../../components/Board/Board';

/* ===================================== */
/* Mock Users */
/* ===================================== */

export const MockUser1: User = {
  id: 'user-123',
  name: 'Manya Jain',
  email: 'manya@iitd.ac.in',
  role: 'USER',
  avatarUrl: null,
};

export const MockUser2: User = {
  id: 'user-456',
  name: 'John Doe',
  email: 'john@iitd.ac.in',
  role: 'USER',
  avatarUrl: null,
};

/* ===================================== */
/* Timestamps */
/* ===================================== */

const nowIso = new Date('2026-03-03T10:00:00.000Z').toISOString();

/* ===================================== */
/* Projects */
/* ===================================== */

export const mockProjects: ProjectDetails[] = [
  {
    id: 'project-1',
    name: 'Demo Project',
    description: 'A demo project for TaskFlow',
    userRole: 'PROJECT_MEMBER',
    members: [
      {
        id: MockUser1.id,
        name: MockUser1.name,
        role: 'PROJECT_VIEWER',
        avatarUrl: MockUser1.avatarUrl,
      },
      {
        id: MockUser2.id,
        name: MockUser2.name,
        role: 'PROJECT_MEMBER',
        avatarUrl: MockUser2.avatarUrl,
      },
    ],
    boards: [{ id: 'board-1', name: 'Demo Board' }],
  },
  {
    id: 'project-2',
    name: 'Client Project',
    description: 'A client-facing project',
    userRole: 'PROJECT_VIEWER',
    members: [
      {
        id: MockUser1.id,
        name: MockUser1.name,
        role: 'PROJECT_VIEWER',
        avatarUrl: MockUser1.avatarUrl,
      },
      {
        id: MockUser2.id,
        name: MockUser2.name,
        role: 'PROJECT_MEMBER',
        avatarUrl: MockUser2.avatarUrl,
      },
    ],
    boards: [
      { id: 'board-2', name: 'Client Board' },
      { id: 'board-3', name: 'Roadmap' },
    ],
  },
];

/* ===================================== */
/* Column Generator */
/* ===================================== */

const createColumns = (boardId: string): BoardColumn[] => [
  { id: 'col-story', name: 'Stories', boardId, order: 0, wipLimit: null },
  { id: 'col-backlog', name: 'To Do', boardId, order: 1, wipLimit: null },
  { id: 'col-progress', name: 'In Progress', boardId, order: 2, wipLimit: 3 },
  { id: 'col-review', name: 'Review', boardId, order: 3, wipLimit: 3 },
  { id: 'col-done', name: 'Done', boardId, order: 4, wipLimit: null },
];

/* ===================================== */
/* Tasks */
/* ===================================== */

const mockBoardTasks: Record<string, Task[]> = {
  'board-1': [
    {
      id: 'b1-t1',
      title: 'Set up project',
      description: 'Initialize repository and tooling',
      type: 'BUG',
      columnId: 'col-progress',
      columnName: 'In Progress',
      priority: 'HIGH',
      assigneeId: MockUser1.id,
      reporterId: MockUser1.id,
      parentId: null,
      dueDate: '2026-03-02T00:00:00.000Z',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'b1-t2',
      title: 'Implement login',
      description: 'Create login UI and navigation',
      type: 'STORY',
      columnId: 'col-story',
      columnName: 'Stories',
      priority: 'MEDIUM',
      assigneeId: MockUser1.id,
      reporterId: MockUser1.id,
      parentId: null,
      dueDate: '2026-03-05T00:00:00.000Z',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'b1-t3',
      title: 'Configure CI',
      description: 'Add lint and build steps',
      type: 'TASK',
      columnId: 'col-backlog',
      columnName: 'To Do',
      priority: 'HIGH',
      assigneeId: MockUser1.id,
      reporterId: MockUser1.id,
      parentId: 'b1-t2',
      dueDate: '2026-03-06T00:00:00.000Z',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'b1-t4',
      title: 'Set up project',
      description: 'Initialize repository and tooling',
      type: 'TASK',
      columnId: 'col-progress',
      columnName: 'In Progress',
      priority: 'HIGH',
      assigneeId: MockUser1.id,
      reporterId: MockUser1.id,
      parentId: null,
      dueDate: '2026-03-02T00:00:00.000Z',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'b1-t5',
      title: 'Implement login',
      description: 'Create login UI and navigation',
      type: 'STORY',
      columnId: 'col-story',
      columnName: 'Stories',
      priority: 'MEDIUM',
      assigneeId: MockUser1.id,
      reporterId: MockUser1.id,
      parentId: null,
      dueDate: '2026-03-05T00:00:00.000Z',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'b1-t6',
      title: 'Configure CI',
      description: 'Add lint and build steps',
      type: 'TASK',
      columnId: 'col-backlog',
      columnName: 'To Do',
      priority: 'HIGH',
      assigneeId: MockUser1.id,
      reporterId: MockUser1.id,
      parentId: 'b1-t2',
      dueDate: '2026-03-06T00:00:00.000Z',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ],
  'board-2': [
    {
      id: 'b1-t1',
      title: 'Set up project',
      description: 'Initialize repository and tooling',
      type: 'TASK',
      columnId: 'col-done',
      columnName: 'Done',
      priority: 'HIGH',
      assigneeId: MockUser1.id,
      reporterId: MockUser1.id,
      parentId: null,
      dueDate: '2026-03-02T00:00:00.000Z',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'b1-t2',
      title: 'Implement login',
      description: 'Create login UI and navigation',
      type: 'STORY',
      columnId: 'col-story',
      columnName: 'Stories',
      priority: 'MEDIUM',
      assigneeId: MockUser1.id,
      reporterId: MockUser1.id,
      parentId: null,
      dueDate: '2026-03-05T00:00:00.000Z',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'b1-t3',
      title: 'Configure CI',
      description: 'Add lint and build steps',
      type: 'TASK',
      columnId: 'col-backlog',
      columnName: 'To Do',
      priority: 'HIGH',
      assigneeId: MockUser1.id,
      reporterId: MockUser1.id,
      parentId: 'b1-t2',
      dueDate: '2026-03-06T00:00:00.000Z',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ],
  'board-3': [
    {
      id: 'b1-t1',
      title: 'Set up project',
      description: 'Initialize repository and tooling',
      type: 'TASK',
      columnId: 'col-done',
      columnName: 'Done',
      priority: 'HIGH',
      assigneeId: MockUser1.id,
      reporterId: MockUser1.id,
      parentId: null,
      dueDate: '2026-03-02T00:00:00.000Z',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'b1-t2',
      title: 'Implement login',
      description: 'Create login UI and navigation',
      type: 'STORY',
      columnId: 'col-story',
      columnName: 'Stories',
      priority: 'MEDIUM',
      assigneeId: MockUser1.id,
      reporterId: MockUser1.id,
      parentId: null,
      dueDate: '2026-03-05T00:00:00.000Z',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'b1-t3',
      title: 'Configure CI',
      description: 'Add lint and build steps',
      type: 'TASK',
      columnId: 'col-backlog',
      columnName: 'To Do',
      priority: 'HIGH',
      assigneeId: MockUser1.id,
      reporterId: MockUser1.id,
      parentId: 'b1-t2',
      dueDate: '2026-03-06T00:00:00.000Z',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ],
};

/* ===================================== */
/* Resolver */
/* ===================================== */

const cloneTasks = (tasks: Task[]): Task[] =>
  tasks.map((task) => ({ ...task }));

export const resolveProjectBoardSelection = (
  projectId: string,
  boardId: string,
): { project: ProjectDetails; board: Board } | null => {
  const project = mockProjects.find((p) => p.id === projectId);
  if (!project) return null;

  const boardMeta = project.boards.find((b) => b.id === boardId);
  if (!boardMeta) return null;

  const board: Board = {
    id: boardMeta.id,
    name: boardMeta.name,
    projectId: project.id,
    columns: createColumns(boardMeta.id),
    tasks: cloneTasks(mockBoardTasks[boardMeta.id] ?? []),
  };

  return { project, board };
};

/* ===================================== */
/* Defaults */
/* ===================================== */

export const defaultProjectId = mockProjects[0]?.id ?? '';
export const defaultBoardId = mockProjects[0]?.boards[0]?.id ?? '';

/* ===================================== */
/* Routing helpers (previously in BoardData) */
/* ===================================== */

export const buildBoardPath = (projectId: string, boardId: string) =>
  `/projects/${projectId}/boards/${boardId}`;

export const defaultBoardPath = buildBoardPath(
  defaultProjectId,
  defaultBoardId,
);

/* ===================================== */
/* Page Component */
/* ===================================== */

export default function BoardPage() {
  const { projectId, boardId } = useParams();

  const resolvedProjectId = projectId ?? defaultProjectId;
  const resolvedBoardId = boardId ?? defaultBoardId;

  const selection = useMemo(() => {
    return (
      resolveProjectBoardSelection(resolvedProjectId, resolvedBoardId) ??
      resolveProjectBoardSelection(defaultProjectId, defaultBoardId)
    );
  }, [resolvedProjectId, resolvedBoardId]);

  if (!selection) {
    return (
      <Layout>
        <div style={{ padding: '20px' }}>No project/board data found.</div>
      </Layout>
    );
  }

  const [board, setBoard] = useState(selection.board);

  useEffect(() => {
    setBoard(selection.board);
  }, [selection.board]);

  const deleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      try {
        // Permission check
        const projectDetails = selection.project;
        if (projectDetails.userRole === 'PROJECT_VIEWER') {
          alert('You do not have permission to delete tasks.');
          return;
        }

        // Parent-child protection
        const hasChildren = board.tasks.some((t) => t.parentId === taskId);
        if (hasChildren) {
          alert('Cannot delete a Story with child tasks.');
          return;
        }

        // Simulate backend delay
        await new Promise((res) => setTimeout(res, 300));

        setBoard((prev) => ({
          ...prev,
          tasks: prev.tasks.filter((t) => t.id !== taskId),
        }));
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    },
    [board.tasks, selection.project],
  );

  return (
    <Layout>
      <div style={{ padding: '20px' }}>
        <h1>TaskFlow Platform</h1>
        <BoardView
          key={`${selection.project.id}:${board.id}`}
          board={board}
          projectDetails={selection.project}
          onDeleteTask={deleteTask}
        />
      </div>
    </Layout>
  );
}
