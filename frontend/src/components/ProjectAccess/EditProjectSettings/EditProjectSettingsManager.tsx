import type {
  AuthUser,
  DirectoryUser,
  ProjectDetails,
  ProjectMemberSummary,
} from '../../../types/Types';
import styles from './EditProjectSettingsManager.module.css';
import { useProjectManager } from './useProjectManager';
import { ProjectMemberManagement } from './ProjectMemberManagement';

interface Props {
  user: AuthUser;
  adminProjects: ProjectDetails[];
  directoryUsers: DirectoryUser[];
  onSaveProjectSettings: (input: {
    projectId: string;
    name: string;
    description: string;
    isArchived: boolean;
    members: ProjectMemberSummary[];
  }) => Promise<void>;
  onDeleteProject: (input: { projectId: string }) => Promise<void>;
}

const EditProjectSettingsManager = ({
  user,
  adminProjects,
  directoryUsers,
  onSaveProjectSettings,
  onDeleteProject,
}: Props) => {
  const {
    selectedProjectId,
    setSelectedProjectId,
    projectQuery,
    setProjectQuery,
    userQuery,
    setUserQuery,
    memberQuery,
    setMemberQuery,
    directoryRoles,
    draftName,
    setDraftName,
    draftDescription,
    setDraftDescription,
    draftArchived,
    setDraftArchived,
    draftMembers,
    statusMessage,
    isSubmitting,
    filteredProjects,
    selectedProject,
    availableUsers,
    filteredMembers,
    canDeleteSelectedProject,
    handleReset,
    handleSave,
    handleDeleteProject,
    updateDirectoryRole,
    handleAddUser,
    handleUpdateMemberRole,
    handleRemoveMember,
  } = useProjectManager(
    user,
    adminProjects,
    directoryUsers,
    onSaveProjectSettings,
    onDeleteProject,
  );

  return (
    <div className={styles.pageContainer}>
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
                <label htmlFor="project-search">Search projects</label>
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
                    aria-pressed={project.id === selectedProjectId}
                    aria-label={`Select project ${project.name}`}
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
                  aria-label="Archive project"
                />
              </div>

              <div className={styles.projectStatsGrid}>
                <div className={styles.projectStatCard}>
                  <div className={styles.projectStatLabel}>Members</div>
                  <div className={styles.projectStatValue}>
                    {draftMembers.length}
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

              <ProjectMemberManagement
                user={user}
                isSubmitting={isSubmitting}
                availableUsers={availableUsers}
                filteredMembers={filteredMembers}
                directoryRoles={directoryRoles}
                userQuery={userQuery}
                memberQuery={memberQuery}
                setUserQuery={setUserQuery}
                setMemberQuery={setMemberQuery}
                updateDirectoryRole={updateDirectoryRole}
                handleAddUser={handleAddUser}
                handleUpdateMemberRole={handleUpdateMemberRole}
                handleRemoveMember={handleRemoveMember}
              />

              <div className={styles.formActions}>
                {canDeleteSelectedProject && (
                  <button
                    type="button"
                    className={styles.deleteActionButton}
                    disabled={isSubmitting || !canDeleteSelectedProject}
                    onClick={handleDeleteProject}
                  >
                    Delete project
                  </button>
                )}
                <button
                  type="button"
                  className={styles.ghostActionButton}
                  disabled={isSubmitting}
                  onClick={handleReset}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className={styles.primaryActionButton}
                  disabled={isSubmitting}
                  onClick={handleSave}
                >
                  {isSubmitting ? 'Saving...' : 'Save settings'}
                </button>
              </div>
            </div>
          )}

          {statusMessage && (
            <div
              className={styles.feedbackMessage}
              role="status"
              aria-live="polite"
            >
              {statusMessage}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default EditProjectSettingsManager;
