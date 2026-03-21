import { useEffect, useState } from 'react';
import type {
  AuthUser,
  ProjectDetails,
  ProjectRole,
} from '../../../types/Types';
import { PROJECT_ROLE_OPTIONS } from '../../../utils/getUtils';
import { getInitials } from '../../../utils/getInitials';
import styles from './AssignUsersManager.module.css';

interface Props {
  user: AuthUser;
  adminProjects: ProjectDetails[];
  onUpdateAssignedRole: (
    projectId: string,
    memberId: string,
    newRole: ProjectRole,
  ) => Promise<void>;
}

const AssignUsersManager = ({
  user,
  adminProjects,
  onUpdateAssignedRole,
}: Props) => {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [statusMsg, setstatusMsg] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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

  const selectedProject =
    adminProjects.find((project) => project.id === selectedProjectId) ?? null;
  const visibleMembers = selectedProject ? selectedProject.members : [];

  const updateAssignedRole = async (
    memberId: string,
    newRole: ProjectRole,
  ): Promise<void> => {
    if (!selectedProject) {
      return;
    }

    const editedMembers = visibleMembers.map((member) =>
      member.id === memberId ? { ...member, role: newRole } : member,
    );

    if (!editedMembers.some((member) => member.role === 'PROJECT_ADMIN')) {
      setstatusMsg('Each project must keep at least one admin.');
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateAssignedRole(selectedProject.id, memberId, newRole);
      setstatusMsg(`Updated access roles in "${selectedProject.name}".`);
    } catch (error) {
      setstatusMsg((error as Error).message || 'Failed to update role.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentColumn}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Assign User Roles</h2>
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

              {selectedProject && (
                <div className={styles.membersList}>
                  {visibleMembers.map((member) => (
                    <div key={member.id} className={styles.memberCard}>
                      <div className={styles.userIdentity}>
                        <div className={styles.userAvatar}>
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name} />
                          ) : (
                            getInitials(member.name)
                          )}
                        </div>
                        <div>
                          <div className={styles.userName}>{member.name}</div>
                          <div className={styles.userEmail}>{member.email}</div>
                          <div className={styles.userAvatarUrl}>
                            {member.avatarUrl ?? 'No avatar URL'}
                          </div>
                        </div>
                      </div>
                      <div className={styles.memberRoleField}>
                        <select
                          value={member.role}
                          disabled={isUpdating}
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
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {statusMsg && <div className={styles.Message}>{statusMsg}</div>}
        </section>
      </div>
    </div>
  );
};

export default AssignUsersManager;
