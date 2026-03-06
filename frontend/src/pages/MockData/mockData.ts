import type { User, ProjectDetails, Task } from '../../types/Types';

/* ===================================== */
/* Mock Users */
/* ===================================== */

export const MockUser1: User = {
  id: 'user-123',
  name: 'Manya Jain',
  email: 'manya@iitd.ac.in',
  globalRole: 'USER',
  avatarUrl: null,
  notifications: [],
  projects: [],
};

export const MockUser2: User = {
  id: 'user-456',
  name: 'John Doe',
  email: 'john@iitd.ac.in',
  globalRole: 'USER',
  avatarUrl: null,
  notifications: [],
  projects: [],
};

/* ===================================== */
/* Timestamps */
/* ===================================== */

export const nowIso = new Date('2026-03-03T10:00:00.000Z').toISOString();

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
        email: MockUser1.email,
        name: MockUser1.name,
        role: 'PROJECT_ADMIN',
      },
      {
        id: MockUser2.id,
        name: MockUser2.name,
        email: MockUser2.email,
        role: 'PROJECT_MEMBER',
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
        email: MockUser1.email,
        role: 'PROJECT_VIEWER',
      },
      {
        id: MockUser2.id,
        name: MockUser2.name,
        email: MockUser2.email,
        role: 'PROJECT_MEMBER',
      },
    ],
    boards: [
      { id: 'board-2', name: 'Client Board' },
      { id: 'board-3', name: 'Roadmap' },
    ],
  },
];

/* ===================================== */
/* Tasks */
/* ===================================== */

export const mockBoardTasks: Record<string, Task[]> = {
  'board-1': [
    {
      id: 'b1-t1',
      title: 'Set up project',
      description: 'Initialize repository and tooling',
      type: 'BUG',
      columnId: 'col-progress',
      status: 'In Progress',
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
      status: 'Stories',
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
      status: 'To Do',
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
      status: 'In Progress',
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
      status: 'Stories',
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
      status: 'To Do',
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
      status: 'Done',
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
      status: 'Stories',
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
      status: 'To Do',
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
      status: 'Done',
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
      status: 'Stories',
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
      status: 'To Do',
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
