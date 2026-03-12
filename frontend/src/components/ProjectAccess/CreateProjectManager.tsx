import { useMemo, useState } from 'react';
import type { ProjectMemberSummary, ProjectRole } from '../../types/Types';
import styles from './CreateProjectManager.module.css';
import {
  INITIAL_DIRECTORY,
  PROJECT_ROLE_OPTIONS,
  type ManagedProject,
} from './projectAccessMock';
import { useManagedProjects } from './useManagedProjects';

const createInitialSelection = (
  currentUser: NonNullable<
    ReturnType<typeof useManagedProjects>['currentDirectoryUser']
  >,
): ProjectMemberSummary[] => [
  {
    ...currentUser,
    role: 'PROJECT_ADMIN',
  },
];

const getInitials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const CreateProjectManager = () => {
  const { user, setManagedProjects, currentDirectoryUser } =
    useManagedProjects();
  const [projectTitle, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [directoryRoles, setDirectoryRoles] = useState<
    Record<string, ProjectRole>
  >({});
  const [selectedMembers, setSelectedMembers] = useState<
    ProjectMemberSummary[]
  >(() =>
    currentDirectoryUser ? createInitialSelection(currentDirectoryUser) : [],
  );

  const visibleDirectory = useMemo(() => {
    const query = directoryQuery.trim().toLowerCase();
    const selectedEmails = new Set(
      selectedMembers.map((member) => member.email),
    );

    return INITIAL_DIRECTORY.filter((person) => {
      if (person.globalRole === 'GLOBAL_ADMIN') {
        return false;
      }

      if (selectedEmails.has(person.email)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        person.name.toLowerCase().includes(query) ||
        person.email.toLowerCase().includes(query)
      );
    });
  }, [directoryQuery, selectedMembers]);

  if (!user || !currentDirectoryUser || user.globalRole !== 'GLOBAL_ADMIN') {
    return null;
  }

  const addMember = (member: ProjectMemberSummary): void => {
    setSelectedMembers((prev) => [...prev, member]);
  };

  const updateDraftMemberRole = (
    memberId: string,
    nextRole: ProjectRole,
  ): void => {
    setSelectedMembers((prev) =>
      prev.map((member) =>
        member.id === memberId ? { ...member, role: nextRole } : member,
      ),
    );
  };

  const updateDirectoryRole = (email: string, nextRole: ProjectRole): void => {
    setDirectoryRoles((prev) => ({
      ...prev,
      [email]: nextRole,
    }));
  };

  const removeDraftMember = (memberId: string): void => {
    setSelectedMembers((prev) =>
      prev.filter((member) => member.id !== memberId),
    );
  };

  const resetDraft = (): void => {
    setProjectName('');
    setProjectDescription('');
    setDirectoryQuery('');
    setDirectoryRoles({});
    setSelectedMembers(createInitialSelection(currentDirectoryUser));
    setStatusMessage('');
  };

  const handleCreateProject = (): void => {
    if (!projectTitle.trim()) {
      setStatusMessage(
        'Project name is required before you can save the draft.',
      );
      return;
    }

    const createdProject: ManagedProject = {
      id: `project-${Date.now()}`,
      name: projectTitle.trim(),
      description: projectDescription.trim() || null,
      boards: [],
      isArchived: false,
      members: selectedMembers,
    };

    setManagedProjects((prev) => [createdProject, ...prev]);
    resetDraft();
    setStatusMessage(
      `Created "${createdProject.name}" in frontend demo state.`,
    );
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeading}>
          <h1>Create Project</h1>
        </div>
      </div>

      <div className={styles.contentColumn}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Create New Project</h2>
          </div>

          <div className={styles.projectForm}>
            <div className={styles.formField}>
              <label htmlFor="project-name">Project name</label>
              <input
                id="project-name"
                value={projectTitle}
                onChange={(event) => setProjectName(event.target.value)}
              />
            </div>

            <div className={`${styles.formField} ${styles.spanFull}`}>
              <label htmlFor="project-description">Description</label>
              <textarea
                id="project-description"
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.contentSectionHeader}>
            <h3>Available users</h3>
          </div>

          <div className={styles.userSearchBar}>
            <div className={styles.formField}>
              <input
                id="directory-search"
                value={directoryQuery}
                onChange={(event) => setDirectoryQuery(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.availableUsersList}>
            {visibleDirectory.map((person) => (
              <div key={person.id} className={styles.availableUserCard}>
                <div className={styles.userIdentity}>
                  <div className={styles.userAvatar}>
                    {getInitials(person.name)}
                  </div>
                  <div className={styles.userText}>
                    <div className={styles.userName}>{person.name}</div>
                    <div className={styles.userEmail}>{person.email}</div>
                  </div>
                </div>
                <div className={styles.availableUserActions}>
                  <div className={styles.roleSelector}>
                    <label htmlFor={`role-${person.id}`}>Role</label>
                    <select
                      id={`role-${person.id}`}
                      value={directoryRoles[person.email] ?? 'PROJECT_MEMBER'}
                      onChange={(event) =>
                        updateDirectoryRole(
                          person.email,
                          event.target.value as ProjectRole,
                        )
                      }
                    >
                      {PROJECT_ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className={styles.secondaryActionButton}
                    onClick={() =>
                      addMember({
                        ...person,
                        role: directoryRoles[person.email] ?? 'PROJECT_MEMBER',
                      })
                    }
                  >
                    Add to project
                  </button>
                </div>
              </div>
            ))}
            {visibleDirectory.length === 0 && (
              <div className={styles.emptyMessage}>
                No additional directory users match the current search.
              </div>
            )}
          </div>

          <div className={styles.contentSectionHeader}>
            <h3>Assigned members</h3>
          </div>

          <div className={styles.membersList}>
            {selectedMembers
              .filter((member) => member.email !== currentDirectoryUser.email)
              .map((member) => (
                <div key={member.id} className={styles.memberCard}>
                  <div className={styles.userIdentity}>
                    <div className={styles.userAvatar}>
                      {getInitials(member.name)}
                    </div>
                    <div className={styles.userText}>
                      <div className={styles.userName}>{member.name}</div>
                      <div className={styles.userEmail}>{member.email}</div>
                    </div>
                  </div>
                  <div className={styles.memberRoleField}>
                    <select
                      value={member.role}
                      onChange={(event) =>
                        updateDraftMemberRole(
                          member.id,
                          event.target.value as ProjectRole,
                        )
                      }
                    >
                      {PROJECT_ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className={styles.ghostActionButton}
                    onClick={() => removeDraftMember(member.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
          </div>

          <div className={styles.panelHeader}>
            <button
              type="button"
              className={styles.ghostActionButton}
              onClick={resetDraft}
            >
              Reset
            </button>{' '}
            <button
              type="button"
              className={styles.primaryActionButton}
              onClick={handleCreateProject}
            >
              Create project
            </button>
          </div>

          {statusMessage && (
            <div className={styles.feedbackMessage}>{statusMessage}</div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CreateProjectManager;
