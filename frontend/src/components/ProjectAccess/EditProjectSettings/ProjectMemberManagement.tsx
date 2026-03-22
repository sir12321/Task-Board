import type {
  AuthUser,
  DirectoryUser,
  ProjectMemberSummary,
  ProjectRole,
} from '../../../types/Types';
import { getInitials } from '../../../utils/getInitials';
import { PROJECT_ROLE_OPTIONS } from '../../../utils/getUtils';
import styles from './EditProjectSettingsManager.module.css';

interface ProjectMemberManagementProps {
  user: AuthUser;
  isSubmitting: boolean;
  availableUsers: DirectoryUser[];
  filteredMembers: ProjectMemberSummary[];
  directoryRoles: Record<string, ProjectRole>;
  userQuery: string;
  memberQuery: string;
  setUserQuery: (query: string) => void;
  setMemberQuery: (query: string) => void;
  updateDirectoryRole: (email: string, nextRole: ProjectRole) => void;
  handleAddUser: (userId: string) => void;
  handleUpdateMemberRole: (memberId: string, nextRole: ProjectRole) => void;
  handleRemoveMember: (memberId: string) => void;
}

export const ProjectMemberManagement = ({
  user,
  isSubmitting,
  availableUsers,
  filteredMembers,
  directoryRoles,
  userQuery,
  memberQuery,
  setUserQuery,
  setMemberQuery,
  updateDirectoryRole,
  handleAddUser,
  handleUpdateMemberRole,
  handleRemoveMember,
}: ProjectMemberManagementProps) => {
  return (
    <div className={styles.memberManagementSection}>
      {user.globalRole === 'GLOBAL_ADMIN' && (
        <>
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
                    {person.avatarUrl ? (
                      <img src={person.avatarUrl} alt={person.name} />
                    ) : (
                      getInitials(person.name)
                    )}
                  </div>
                  <div>
                    <div className={styles.userName}>{person.name}</div>
                    <div className={styles.userEmail}>{person.email}</div>
                  </div>
                </div>
                <div className={styles.availableUserActions}>
                  <div className={styles.roleSelector}>
                    <label htmlFor={`settings-role-${person.id}`}>Role</label>
                    <select
                      id={`settings-role-${person.id}`}
                      value={directoryRoles[person.email] ?? 'PROJECT_MEMBER'}
                      disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
        </>
      )}

      <div className={styles.contentSectionHeader}>
        <div>
          <h3>Current members</h3>
        </div>
      </div>

      <div
        className={`${styles.searchInputGroup} ${styles.compactSearchInputGroup}`}
      >
        <label htmlFor="project-member-search">Search current members</label>
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
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt={member.name} />
                ) : (
                  getInitials(member.name)
                )}
              </div>
              <div>
                <div className={styles.userName}>{member.name}</div>
                <div className={styles.userEmail}>{member.email}</div>
              </div>
            </div>
            {user.globalRole === 'GLOBAL_ADMIN' && (
              <div className={styles.memberActions}>
                <div className={styles.memberRoleSelectWrap}>
                  <select
                    value={member.role}
                    disabled={isSubmitting}
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
                <button
                  type="button"
                  className={styles.deleteActionButton}
                  disabled={isSubmitting}
                  onClick={() => handleRemoveMember(member.id)}
                >
                  Remove
                </button>
              </div>
            )}
            {user.globalRole !== 'GLOBAL_ADMIN' && (
              <div className={styles.memberRoleSelectWrap}>
                <span>{member.role.replace('PROJECT_', '')}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className={styles.emptyMessage}>
          No current members match the current search.
        </div>
      )}
    </div>
  );
};
