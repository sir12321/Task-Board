import { useEffect, useMemo, useState } from 'react';
import type { ProjectRole } from '../../types/Types';
import styles from './EditProjectSettingsManager.module.css';
import { useManagedProjects } from './useManagedProjects';
import { INITIAL_DIRECTORY, PROJECT_ROLE_OPTIONS } from './projectAccessMock';

const getInitials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const EditProjectSettingsManager = () => {
  const { user, adminProjects, setManagedProjects } = useManagedProjects();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectQuery, setProjectQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [directoryRoles, setDirectoryRoles] = useState<
    Record<string, ProjectRole>
  >({});
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftArchived, setDraftArchived] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const filteredProjects = useMemo(() => {
    const query = projectQuery.trim().toLowerCase();

    if (!query) {
      return adminProjects;
    }

    return adminProjects.filter((project) =>
      project.name.toLowerCase().includes(query),
    );
  }, [adminProjects, projectQuery]);

  useEffect(() => {
    if (!selectedProjectId && filteredProjects.length > 0) {
      setSelectedProjectId(filteredProjects[0].id);
      return;
    }

    if (
      selectedProjectId &&
      !filteredProjects.some((project) => project.id === selectedProjectId)
    ) {
      setSelectedProjectId(filteredProjects[0]?.id ?? '');
    }
  }, [filteredProjects, selectedProjectId]);

  const selectedProject =
    filteredProjects.find((project) => project.id === selectedProjectId) ??
    adminProjects.find((project) => project.id === selectedProjectId) ??
    null;

  const availableUsers = useMemo(() => {
    if (!selectedProject) {
      return [];
    }

    const query = userQuery.trim().toLowerCase();
    const assignedEmails = new Set(
      selectedProject.members.map((member) => member.email),
    );

    return INITIAL_DIRECTORY.filter((person) => {
      if (person.globalRole === 'GLOBAL_ADMIN') {
        return false;
      }

      if (assignedEmails.has(person.email)) {
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
  }, [selectedProject, userQuery]);

  const filteredMembers = useMemo(() => {
    if (!selectedProject) {
      return [];
    }

    const query = memberQuery.trim().toLowerCase();
    if (!query) {
      return selectedProject.members;
    }

    return selectedProject.members.filter(
      (member) =>
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query),
    );
  }, [memberQuery, selectedProject]);

  useEffect(() => {
    if (!selectedProject) {
      setDraftName('');
      setDraftDescription('');
      setDraftArchived(false);
      return;
    }

    setDraftName(selectedProject.name);
    setDraftDescription(selectedProject.description ?? '');
    setDraftArchived(Boolean(selectedProject.isArchived));
  }, [selectedProject]);

  if (!user) {
    return null;
  }

  const handleReset = (): void => {
    if (!selectedProject) {
      return;
    }

    setDraftName(selectedProject.name);
    setDraftDescription(selectedProject.description ?? '');
    setDraftArchived(Boolean(selectedProject.isArchived));
    setStatusMessage('');
  };

  const handleSave = (): void => {
    if (!selectedProject) {
      return;
    }

    if (!draftName.trim()) {
      setStatusMessage('Project name cannot be empty.');
      return;
    }

    setManagedProjects((prev) =>
      prev.map((project) =>
        project.id === selectedProject.id
          ? {
              ...project,
              name: draftName.trim(),
              description: draftDescription.trim() || null,
              isArchived: draftArchived,
            }
          : project,
      ),
    );

    setStatusMessage(`Saved settings for "${draftName.trim()}".`);
  };

  const updateDirectoryRole = (email: string, nextRole: ProjectRole): void => {
    setDirectoryRoles((prev) => ({
      ...prev,
      [email]: nextRole,
    }));
  };

  const handleAddUser = (userId: string): void => {
    if (!selectedProject) {
      return;
    }

    const directoryUser = INITIAL_DIRECTORY.find(
      (person) => person.id === userId,
    );
    if (!directoryUser) {
      return;
    }

    const role = directoryRoles[directoryUser.email] ?? 'PROJECT_MEMBER';

    setManagedProjects((prev) =>
      prev.map((project) =>
        project.id === selectedProject.id
          ? {
              ...project,
              members: [
                ...project.members,
                {
                  id: directoryUser.id,
                  name: directoryUser.name,
                  email: directoryUser.email,
                  role,
                },
              ],
            }
          : project,
      ),
    );

    setStatusMessage(
      `Added ${directoryUser.name} to "${selectedProject.name}".`,
    );
    setUserQuery('');
  };

  const handleUpdateMemberRole = (
    memberId: string,
    nextRole: ProjectRole,
  ): void => {
    if (!selectedProject) {
      return;
    }

    const nextMembers = selectedProject.members.map((member) =>
      member.id === memberId ? { ...member, role: nextRole } : member,
    );

    if (!nextMembers.some((member) => member.role === 'PROJECT_ADMIN')) {
      setStatusMessage('Each project must keep at least one admin.');
      return;
    }

    setManagedProjects((prev) =>
      prev.map((project) =>
        project.id === selectedProject.id
          ? {
              ...project,
              members: project.members.map((member) =>
                member.email === 'admin@taskboard.com'
                  ? member
                  : (nextMembers.find(
                      (nextMember) => nextMember.id === member.id,
                    ) ?? member),
              ),
            }
          : project,
      ),
    );

    setStatusMessage(`Updated member roles in "${selectedProject.name}".`);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeading}>
          <h1>Edit Project Settings</h1>
        </div>
      </div>

      <div className={styles.settingsLayout}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Projects</h2>
          </div>

          {adminProjects.length === 0 ? (
            <div className={styles.emptyMessage}>
              {user.globalRole === 'GLOBAL_ADMIN'
                ? 'No locally managed projects are available yet.'
                : 'You are not a project admin on any project, so settings are unavailable here.'}
            </div>
          ) : (
            <>
              <div className={styles.searchInputGroup}>
                <input
                  id="project-search"
                  value={projectQuery}
                  onChange={(event) => setProjectQuery(event.target.value)}
                />
              </div>

              <div className={styles.projectCards}>
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className={`${styles.projectCardButton} ${
                      project.id === selectedProjectId
                        ? styles.projectCardButtonActive
                        : ''
                    }`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <div className={styles.projectTitle}>{project.name}</div>
                    <div className={styles.projectDetails}>
                      {project.isArchived ? 'Archived' : 'Active'} ·{' '}
                      {project.members.length} members
                    </div>
                  </button>
                ))}
              </div>

              {filteredProjects.length === 0 && (
                <div className={styles.emptyMessage}>
                  No projects match the current search.
                </div>
              )}
            </>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Settings</h2>
          </div>

          {!selectedProject ? (
            <div className={styles.emptyMessage}>
              Select a project from the left to edit it.
            </div>
          ) : (
            <div className={styles.projectForm}>
              <div className={styles.formField}>
                <label htmlFor="settings-project-name">Project name</label>
                <input
                  id="settings-project-name"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="settings-project-description">
                  Description
                </label>
                <textarea
                  id="settings-project-description"
                  value={draftDescription}
                  onChange={(event) => setDraftDescription(event.target.value)}
                />
              </div>

              <div className={styles.archiveToggleRow}>
                <div className={styles.archiveToggleText}>
                  <h3>Archive project</h3>
                </div>
                <input
                  type="checkbox"
                  className={styles.archiveToggle}
                  checked={draftArchived}
                  onChange={(event) => setDraftArchived(event.target.checked)}
                />
              </div>

              <div className={styles.projectStatsGrid}>
                <div className={styles.projectStatCard}>
                  <div className={styles.projectStatLabel}>Members</div>
                  <div className={styles.projectStatValue}>
                    {selectedProject.members.length}
                  </div>
                </div>
                <div className={styles.projectStatCard}>
                  <div className={styles.projectStatLabel}>Boards</div>
                  <div className={styles.projectStatValue}>
                    {selectedProject.boards.length}
                  </div>
                </div>
                <div className={styles.projectStatCard}>
                  <div className={styles.projectStatLabel}>Status</div>
                  <div className={styles.projectStatValue}>
                    {draftArchived ? 'Archived' : 'Active'}
                  </div>
                </div>
              </div>

              <div className={styles.memberManagementSection}>
                <div className={styles.contentSectionHeader}>
                  <div>
                    <h3>Manage users</h3>
                  </div>
                </div>

                <div
                  className={`${styles.searchInputGroup} ${styles.compactSearchInputGroup}`}
                >
                  <label htmlFor="project-user-search">Search users</label>
                  <input
                    id="project-user-search"
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                  />
                </div>

                <div className={styles.availableUsersList}>
                  {availableUsers.map((person) => (
                    <div key={person.id} className={styles.availableUserCard}>
                      <div className={styles.userIdentity}>
                        <div className={styles.userAvatar}>
                          {getInitials(person.name)}
                        </div>
                        <div>
                          <div className={styles.userName}>{person.name}</div>
                          <div className={styles.userEmail}>
                            {person.email}
                          </div>
                        </div>
                      </div>
                      <div className={styles.availableUserActions}>
                        <div className={styles.roleSelector}>
                          <label htmlFor={`settings-role-${person.id}`}>
                            Role
                          </label>
                          <select
                            id={`settings-role-${person.id}`}
                            value={
                              directoryRoles[person.email] ?? 'PROJECT_MEMBER'
                            }
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
                          className={styles.primaryActionButton}
                          onClick={() => handleAddUser(person.id)}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {availableUsers.length === 0 && (
                  <div className={styles.emptyMessage}>
                    No additional users match the current search.
                  </div>
                )}

                <div className={styles.contentSectionHeader}>
                  <div>
                    <h3>Current members</h3>
                  </div>
                </div>

                <div
                  className={`${styles.searchInputGroup} ${styles.compactSearchInputGroup}`}
                >
                  <label htmlFor="project-member-search">
                    Search current members
                  </label>
                  <input
                    id="project-member-search"
                    value={memberQuery}
                    onChange={(event) => setMemberQuery(event.target.value)}
                  />
                </div>

                <div className={styles.membersList}>
                  {filteredMembers.map((member) => (
                    <div key={member.id} className={styles.memberCardRow}>
                      <div className={styles.userIdentity}>
                        <div className={styles.userAvatar}>
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <div className={styles.userName}>{member.name}</div>
                          <div className={styles.userEmail}>
                            {member.email}
                          </div>
                        </div>
                      </div>
                      <div className={styles.memberRoleSelectWrap}>
                        <select
                          value={member.role}
                          onChange={(event) =>
                            handleUpdateMemberRole(
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
                    </div>
                  ))}
                </div>

                {filteredMembers.length === 0 && (
                  <div className={styles.emptyMessage}>
                    No current members match the current search.
                  </div>
                )}
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.ghostActionButton}
                  onClick={handleReset}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className={styles.primaryActionButton}
                  onClick={handleSave}
                >
                  Save settings
                </button>
              </div>
            </div>
          )}

          {statusMessage && (
            <div className={styles.feedbackMessage}>{statusMessage}</div>
          )}
        </section>
      </div>
    </div>
  );
};

export default EditProjectSettingsManager;
