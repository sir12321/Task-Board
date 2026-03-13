import type { DirectoryUser, ManagedProject } from '../../types/Types';

export const INITIAL_DIRECTORY: DirectoryUser[] = [
  {
    id: 'user-admin',
    name: 'Global Admin',
    email: 'admin@taskboard.com',
    globalRole: 'GLOBAL_ADMIN',
  },
  {
    id: 'user-manya',
    name: 'Manya Jain',
    email: 'manya@iitd.ac.in',
    globalRole: 'USER',
  },
  {
    id: 'user-john',
    name: 'John Doe',
    email: 'john@iitd.ac.in',
    globalRole: 'USER',
  },
  {
    id: 'user-alice',
    name: 'Alice Smith',
    email: 'alice@iitd.ac.in',
    globalRole: 'USER',
  },
];

export const seedProjects: ManagedProject[] = [
  {
    id: 'project-demo',
    name: 'Demo Project',
    description: 'A demo project for TaskFlow',
    isArchived: false,
    boards: [
      {
        id: 'board-demo',
        name: 'Demo Board',
      },
    ],
    members: [
      {
        id: 'user-admin',
        name: 'Global Admin',
        email: 'admin@taskboard.com',
        role: 'PROJECT_ADMIN',
      },
      {
        id: 'user-manya',
        name: 'Manya Jain',
        email: 'manya@iitd.ac.in',
        role: 'PROJECT_ADMIN',
      },
      {
        id: 'user-john',
        name: 'John Doe',
        email: 'john@iitd.ac.in',
        role: 'PROJECT_MEMBER',
      },
      {
        id: 'user-alice',
        name: 'Alice Smith',
        email: 'alice@iitd.ac.in',
        role: 'PROJECT_VIEWER',
      },
    ],
  },
  {
    id: 'project-demo',
    name: 'Demo Project',
    description: 'A demo project for TaskFlow',
    isArchived: false,
    boards: [
      {
        id: 'board-demo',
        name: 'Demo Board',
      },
    ],
    members: [
      {
        id: 'user-admin',
        name: 'Global Admin',
        email: 'admin@taskboard.com',
        role: 'PROJECT_ADMIN',
      },
      {
        id: 'user-manya',
        name: 'Manya Jain',
        email: 'manya@iitd.ac.in',
        role: 'PROJECT_ADMIN',
      },
      {
        id: 'user-john',
        name: 'John Doe',
        email: 'john@iitd.ac.in',
        role: 'PROJECT_MEMBER',
      },
      {
        id: 'user-alice',
        name: 'Alice Smith',
        email: 'alice@iitd.ac.in',
        role: 'PROJECT_VIEWER',
      },
    ],
  },
];
