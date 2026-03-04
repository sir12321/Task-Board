import type {
  User,
  ProjectDetails,
  Board,
  BoardColumn,
  Task,
  TaskUpsertInput,
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
    userRole: 'PROJECT_ADMIN',
    members: [
      {
        id: MockUser1.id,
        name: MockUser1.name,
        role: 'PROJECT_ADMIN',
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
      assigneeId: null,
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

let nextBoardId = 4;
let nextCustomColumnId = 1;
const mandatoryColumnIds = ['col-story', 'col-backlog', 'col-done'];

const mockBoardColumns: Record<string, BoardColumn[]> = {
  'board-1': createColumns('board-1'),
  'board-2': createColumns('board-2'),
  'board-3': createColumns('board-3'),
};

/* ===================================== */
/* Resolver */
/* ===================================== */

const cloneTasks = (tasks: Task[]): Task[] =>
  tasks.map((task) => ({ ...task }));
const cloneColumns = (columns: BoardColumn[]): BoardColumn[] =>
  columns.map((column) => ({ ...column }));

const ensureMandatoryColumns = (boardId: string): void => {
  const columns = mockBoardColumns[boardId];
  if (!columns) return;

  const fallbackColumns = createColumns(boardId);
  for (const mandatoryColumnId of mandatoryColumnIds) {
    const exists = columns.some((column) => column.id === mandatoryColumnId);
    if (exists) continue;

    const fallback = fallbackColumns.find((column) => column.id === mandatoryColumnId);
    if (!fallback) continue;

    const maxOrder = columns.reduce((max, c) => Math.max(max, c.order), -1);
    columns.push({ ...fallback, order: maxOrder + 1 });
  }
};

export const resolveProjectBoardSelection = (
  projectId: string,
  boardId: string,
): { project: ProjectDetails; board: Board } | null => {
  const project = mockProjects.find((p) => p.id === projectId);
  if (!project) return null;

  const boardMeta = project.boards.find((b) => b.id === boardId);
  if (!boardMeta) return null;

  ensureMandatoryColumns(boardMeta.id);

  const board: Board = {
    id: boardMeta.id,
    name: boardMeta.name,
    projectId: project.id,
    columns: cloneColumns(
      mockBoardColumns[boardMeta.id] ?? createColumns(boardMeta.id),
    ),
    tasks: cloneTasks(mockBoardTasks[boardMeta.id] ?? []),
  };

  return { project, board };
};

export const createBoardForProject = (
  projectId: string,
  boardName: string,
): { id: string; name: string } | null => {
  const project = mockProjects.find((p) => p.id === projectId);
  if (!project || project.userRole !== 'PROJECT_ADMIN') {
    return null;
  }

  const name = boardName.trim();
  if (!name) {
    return null;
  }

  let boardId = `board-${nextBoardId}`;
  while (project.boards.some((b) => b.id === boardId)) {
    nextBoardId += 1;
    boardId = `board-${nextBoardId}`;
  }

  nextBoardId += 1;
  const newBoard = { id: boardId, name };
  project.boards.push(newBoard);
  mockBoardTasks[boardId] = [];
  mockBoardColumns[boardId] = createColumns(boardId);

  return newBoard;
};

export const updateProjectSettings = (
  projectId: string,
  updates: { name?: string; description?: string },
): ProjectDetails | null => {
  const project = mockProjects.find((p) => p.id === projectId);
  if (!project || project.userRole !== 'PROJECT_ADMIN') {
    return null;
  }

  const nextName = updates.name?.trim();
  const nextDescription = updates.description?.trim();

  if (typeof updates.name === 'string' && !nextName) {
    return null;
  }

  if (typeof updates.name === 'string') {
    project.name = nextName!;
  }

  if (typeof updates.description === 'string') {
    project.description = nextDescription ?? '';
  }

  return { ...project, boards: [...project.boards], members: [...project.members] };
};

export const addColumnToBoard = (
  projectId: string,
  boardId: string,
  columnName: string,
): BoardColumn | null => {
  const project = mockProjects.find((p) => p.id === projectId);
  if (!project || project.userRole !== 'PROJECT_ADMIN') {
    return null;
  }

  const name = columnName.trim();
  if (!name) {
    return null;
  }

  const columns = mockBoardColumns[boardId];
  if (!columns) {
    return null;
  }
  ensureMandatoryColumns(boardId);

  const maxOrder = columns.reduce((max, c) => Math.max(max, c.order), -1);
  const newColumn: BoardColumn = {
    id: `col-custom-${nextCustomColumnId}`,
    name,
    boardId,
    order: maxOrder + 1,
    wipLimit: null,
  };
  nextCustomColumnId += 1;
  columns.push(newColumn);
  return { ...newColumn };
};

export const renameColumnInBoard = (
  projectId: string,
  boardId: string,
  columnId: string,
  newName: string,
): BoardColumn | null => {
  const project = mockProjects.find((p) => p.id === projectId);
  if (!project || project.userRole !== 'PROJECT_ADMIN') {
    return null;
  }

  const name = newName.trim();
  if (!name) {
    return null;
  }

  const columns = mockBoardColumns[boardId];
  if (!columns) {
    return null;
  }
  ensureMandatoryColumns(boardId);

  const column = columns.find((c) => c.id === columnId);
  if (!column) {
    return null;
  }

  column.name = name;
  return { ...column };
};

export const reorderColumnInBoard = (
  projectId: string,
  boardId: string,
  columnId: string,
  direction: 'left' | 'right',
): BoardColumn[] | null => {
  const project = mockProjects.find((p) => p.id === projectId);
  if (!project || project.userRole !== 'PROJECT_ADMIN') {
    return null;
  }

  const columns = mockBoardColumns[boardId];
  if (!columns) {
    return null;
  }
  ensureMandatoryColumns(boardId);

  const ordered = [...columns].sort((a, b) => a.order - b.order);
  const storyIndex = ordered.findIndex((column) => column.id === 'col-story');
  if (storyIndex > 0) {
    const [storyColumn] = ordered.splice(storyIndex, 1);
    ordered.unshift(storyColumn);
  }

  if (columnId === 'col-story') {
    const normalized = ordered.map((column, index) => ({ ...column, order: index }));
    mockBoardColumns[boardId] = normalized;
    return normalized.map((column) => ({ ...column }));
  }

  const currentIndex = ordered.findIndex((column) => column.id === columnId);
  if (currentIndex < 0) {
    return null;
  }

  const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= ordered.length) {
    return ordered.map((column) => ({ ...column }));
  }
  if (ordered[targetIndex]?.id === 'col-story') {
    return ordered.map((column) => ({ ...column }));
  }

  const temp = ordered[currentIndex];
  ordered[currentIndex] = ordered[targetIndex];
  ordered[targetIndex] = temp;

  const reordered = ordered.map((column, index) => ({ ...column, order: index }));
  mockBoardColumns[boardId] = reordered;
  return reordered.map((column) => ({ ...column }));
};

export const updateColumnWipInBoard = (
  projectId: string,
  boardId: string,
  columnId: string,
  wipLimit: number | null,
): BoardColumn | null => {
  const project = mockProjects.find((p) => p.id === projectId);
  if (!project || project.userRole !== 'PROJECT_ADMIN') {
    return null;
  }

  const columns = mockBoardColumns[boardId];
  if (!columns) {
    return null;
  }
  ensureMandatoryColumns(boardId);

  const column = columns.find((c) => c.id === columnId);
  if (!column) {
    return null;
  }

  if (wipLimit !== null && (!Number.isInteger(wipLimit) || wipLimit < 1)) {
    return null;
  }

  column.wipLimit = wipLimit;
  return { ...column };
};

export const deleteColumnFromBoard = (
  projectId: string,
  boardId: string,
  columnId: string,
): BoardColumn[] | null => {
  const project = mockProjects.find((p) => p.id === projectId);
  if (!project || project.userRole !== 'PROJECT_ADMIN') {
    return null;
  }

  if (mandatoryColumnIds.includes(columnId)) {
    return null;
  }

  const columns = mockBoardColumns[boardId];
  if (!columns) {
    return null;
  }
  ensureMandatoryColumns(boardId);

  const hasTasks = (mockBoardTasks[boardId] ?? []).some(
    (task) => task.columnId === columnId,
  );
  if (hasTasks) {
    return null;
  }

  const filtered = columns.filter((column) => column.id !== columnId);
  if (filtered.length === columns.length) {
    return null;
  }

  const normalized = filtered
    .sort((a, b) => a.order - b.order)
    .map((column, index) => ({ ...column, order: index }));

  mockBoardColumns[boardId] = normalized;
  return normalized.map((column) => ({ ...column }));
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

  const createTask = useCallback(
    async (payload: TaskUpsertInput): Promise<void> => {
      const projectDetails = selection.project;
      if (projectDetails.userRole === 'PROJECT_VIEWER') {
        alert('You do not have permission to create tasks.');
        return;
      }

      const now = new Date().toISOString();
      const column = board.columns.find((c) => c.id === payload.columnId);

      await new Promise((res) => setTimeout(res, 200));

      setBoard((prev) => ({
        ...prev,
        tasks: [
          {
            id: `${prev.id}-t${Date.now()}`,
            title: payload.title,
            description: payload.description ?? null,
            type: payload.type,
            priority: payload.priority,
            dueDate: payload.dueDate,
            createdAt: now,
            updatedAt: now,
            columnId: payload.columnId,
            columnName: column?.name ?? 'Unknown',
            reporterId: MockUser1.id,
            assigneeId: payload.assigneeId ?? null,
            parentId: payload.parentId ?? null,
            comments: [],
          },
          ...prev.tasks,
        ],
      }));
    },
    [board.columns, selection.project],
  );

  const updateTask = useCallback(
    async (taskId: string, payload: TaskUpsertInput): Promise<void> => {
      const projectDetails = selection.project;
      if (projectDetails.userRole === 'PROJECT_VIEWER') {
        alert('You do not have permission to edit tasks.');
        return;
      }

      const column = board.columns.find((c) => c.id === payload.columnId);
      await new Promise((res) => setTimeout(res, 200));

      setBoard((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                title: payload.title,
                description: payload.description ?? null,
                type: payload.type,
                priority: payload.priority,
                dueDate: payload.dueDate,
                columnId: payload.columnId,
                columnName: column?.name ?? task.columnName,
                assigneeId: payload.assigneeId ?? null,
                parentId: payload.parentId ?? null,
                updatedAt: new Date().toISOString(),
              }
            : task,
        ),
      }));
    },
    [board.columns, selection.project],
  );

  const addColumn = useCallback(
    async (columnName: string): Promise<void> => {
      if (selection.project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can create columns.');
        return;
      }

      const createdColumn = addColumnToBoard(
        selection.project.id,
        board.id,
        columnName,
      );
      if (!createdColumn) {
        alert('Failed to create column. Please enter a valid name.');
        return;
      }

      setBoard((prev) => ({
        ...prev,
        columns: [...prev.columns, createdColumn].sort((a, b) => a.order - b.order),
      }));
    },
    [board.id, selection.project],
  );

  const renameColumn = useCallback(
    async (columnId: string, newName: string): Promise<void> => {
      if (selection.project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can rename columns.');
        return;
      }

      const updatedColumn = renameColumnInBoard(
        selection.project.id,
        board.id,
        columnId,
        newName,
      );
      if (!updatedColumn) {
        alert('Failed to rename column. Please enter a valid name.');
        return;
      }

      setBoard((prev) => ({
        ...prev,
        columns: prev.columns.map((column) =>
          column.id === columnId ? { ...column, name: updatedColumn.name } : column,
        ),
        tasks: prev.tasks.map((task) =>
          task.columnId === columnId ? { ...task, columnName: updatedColumn.name } : task,
        ),
      }));
    },
    [board.id, selection.project],
  );

  const reorderColumn = useCallback(
    async (columnId: string, direction: 'left' | 'right'): Promise<void> => {
      if (selection.project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can reorder columns.');
        return;
      }

      const reorderedColumns = reorderColumnInBoard(
        selection.project.id,
        board.id,
        columnId,
        direction,
      );

      if (!reorderedColumns) {
        alert('Failed to reorder column.');
        return;
      }

      setBoard((prev) => ({
        ...prev,
        columns: reorderedColumns,
      }));
    },
    [board.id, selection.project],
  );

  const updateColumnWip = useCallback(
    async (columnId: string, wipLimit: number | null): Promise<void> => {
      if (selection.project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can edit WIP limits.');
        return;
      }

      const updatedColumn = updateColumnWipInBoard(
        selection.project.id,
        board.id,
        columnId,
        wipLimit,
      );

      if (!updatedColumn) {
        alert('Failed to update WIP. Use empty for no limit or a number >= 1.');
        return;
      }

      setBoard((prev) => ({
        ...prev,
        columns: prev.columns.map((column) =>
          column.id === columnId ? { ...column, wipLimit: updatedColumn.wipLimit } : column,
        ),
      }));
    },
    [board.id, selection.project],
  );

  const deleteColumn = useCallback(
    async (columnId: string): Promise<void> => {
      if (selection.project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can delete columns.');
        return;
      }

      const updatedColumns = deleteColumnFromBoard(
        selection.project.id,
        board.id,
        columnId,
      );

      if (!updatedColumns) {
        alert(
          'Delete failed. Story, To Do, Done cannot be deleted and column must be empty.',
        );
        return;
      }

      setBoard((prev) => ({
        ...prev,
        columns: updatedColumns,
      }));
    },
    [board.id, selection.project],
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
          onCreateTask={createTask}
          onUpdateTask={updateTask}
          onAddColumn={addColumn}
          onRenameColumn={renameColumn}
          onReorderColumn={reorderColumn}
          onUpdateColumnWip={updateColumnWip}
          onDeleteColumn={deleteColumn}
        />
      </div>
    </Layout>
  );
}
