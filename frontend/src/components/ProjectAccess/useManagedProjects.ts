import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  buildProjectDetailsForUser,
  getDirectoryUser,
  loadManagedProjects,
  saveManagedProjects,
} from './projectAccess';
import type { ManagedProject } from '../../types/Types';

export const useManagedProjects = () => {
  const { user } = useAuth();
  const [managedProjects, setManagedProjects] = useState<ManagedProject[]>(() =>
    loadManagedProjects(),
  );

  useEffect(() => {
    saveManagedProjects(managedProjects);
  }, [managedProjects]);

  const currentDirectoryUser = useMemo(() => {
    if (!user) return null;
    return getDirectoryUser(user);
  }, [user]);

  const userProjects = useMemo(() => {
    if (!user) return [];

    return managedProjects
      .map((project) => buildProjectDetailsForUser(project, user))
      .filter((project): project is NonNullable<typeof project> => !!project);
  }, [managedProjects, user]);

  const adminProjects = useMemo(
    () =>
      userProjects.filter((project) => project.userRole === 'PROJECT_ADMIN'),
    [userProjects],
  );

  return {
    user,
    managedProjects,
    setManagedProjects,
    currentDirectoryUser,
    userProjects,
    adminProjects,
  };
};
