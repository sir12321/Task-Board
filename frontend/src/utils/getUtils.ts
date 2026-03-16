import type { ProjectRole } from '../types/Types';

export const PROJECT_ROLE_OPTIONS: Array<{
  value: ProjectRole;
  label: string;
}> = [
  { value: 'PROJECT_ADMIN', label: 'Admin' },
  { value: 'PROJECT_MEMBER', label: 'Member' },
  { value: 'PROJECT_VIEWER', label: 'Viewer' },
];
