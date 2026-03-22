const PROJECTS_UPDATED_EVENT = 'projects:updated';

export const notifyProjectsUpdated = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(PROJECTS_UPDATED_EVENT));
};

export const subscribeToProjectsUpdated = (
  onProjectsUpdated: () => void,
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {
      // No-op for SSR and tests.
    };
  }

  const listener = () => {
    onProjectsUpdated();
  };

  window.addEventListener(PROJECTS_UPDATED_EVENT, listener);

  return () => {
    window.removeEventListener(PROJECTS_UPDATED_EVENT, listener);
  };
};
