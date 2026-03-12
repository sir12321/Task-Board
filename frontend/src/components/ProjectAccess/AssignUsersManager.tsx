import { useEffect, useState } from 'react';
import type { ProjectRole } from '../../types/Types';
import styles from './AssignUsersManager.module.css';
import { PROJECT_ROLE_OPTIONS } from './projectAccessMock';
import { useManagedProjects } from './useManagedProjects';

const roleLabel = (role: ProjectRole): string =>
  role.replace('PROJECT_', '').replace('MEMBER', 'USER');

const AssignUsersManager = () => {
  const { user, adminProjects, setManagedProjects } = useManagedProjects();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!selectedProjectId && adminProjects.length > 0) {
      setSelectedProjectId(adminProjects[0].id);
      return;
    }

    if (
      selectedProjectId &&
      !adminProjects.some((project) => project.id === selectedProjectId)
    ) {
      setSelectedProjectId(adminProjects[0]?.id ?? '');
    }
  }, [adminProjects, selectedProjectId]);

  if (!user) {
    return null;
  }

  const selectedAdminProject =
    adminProjects.find((project) => project.id === selectedProjectId) ?? null;

  const updateAssignedRole = (
    memberId: string,
    nextRole: ProjectRole,
  ): void => {
    if (!selectedAdminProject) {
      return;
    }

    const nextMembers = selectedAdminProject.members.map((member) =>
      member.id === memberId ? { ...member, role: nextRole } : member,
    );

    if (!nextMembers.some((member) => member.role === 'PROJECT_ADMIN')) {
      setStatusMessage('Each project must keep at least one admin.');
      return;
    }

    setManagedProjects((prev) =>
      prev.map((project) =>
        project.id === selectedAdminProject.id
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
    setStatusMessage(`Updated access roles in "${selectedAdminProject.name}".`);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeading}>
          <h1>Assign Users</h1>
        </div>
      </div>

      <div className={styles.contentColumn}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Assign Users</h2>
              <p>
                {user.globalRole === 'GLOBAL_ADMIN'
                  ? 'Manage member roles for all locally managed projects.'
                  : 'Manage member roles only in projects where you are a project admin.'}
              </p>
            </div>
          </div>

          {adminProjects.length === 0 ? (
            <div className={styles.emptyMessage}>
              {user.globalRole === 'GLOBAL_ADMIN'
                ? 'No locally managed projects are available yet.'
                : 'No projects currently assign you as `PROJECT_ADMIN`, so role changes are disabled.'}
            </div>
          ) : (
            <>
              <div className={styles.projectPicker}>
                <div className={styles.projectCards}>
                  {adminProjects.map((project) => (
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
                        {project.members.length} assigned users
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedAdminProject && (
                <div className={styles.membersList}>
                  {selectedAdminProject.members.map((member) => (
                    <div key={member.id} className={styles.memberCard}>
                      <div>
                        <div className={styles.userName}>{member.name}</div>
                        <div className={styles.userEmail}>{member.email}</div>
                      </div>
                      <div className={styles.memberRoleField}>
                        <select
                          value={member.role}
                          onChange={(event) =>
                            updateAssignedRole(
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
                      <div className={styles.projectDetails}>
                        Current: {roleLabel(member.role)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {statusMessage && (
            <div className={styles.feedbackMessage}>{statusMessage}</div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AssignUsersManager;
