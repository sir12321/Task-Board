import { useMemo, useState } from 'react';
import type { AuthUser, DirectoryUser, GlobalRole } from '../../../types/Types';
import { getInitials } from '../../../utils/getInitials';
import styles from './GlobalRoleManager.module.css';

const GLOBAL_ROLE_OPTIONS: Array<{ value: GlobalRole; label: string }> = [
  { value: 'GLOBAL_ADMIN', label: 'Global Admin' },
  { value: 'USER', label: 'User' },
];

interface Props {
  user: AuthUser;
  directoryUsers: DirectoryUser[];
  onUpdateGlobalRole: (userId: string, globalRole: GlobalRole) => Promise<void>;
}

const roleLabel = (role: GlobalRole): string =>
  role === 'GLOBAL_ADMIN' ? 'Global Admin' : 'User';

const GlobalRoleManager = ({
  user,
  directoryUsers,
  onUpdateGlobalRole,
}: Props) => {
  const [statusMsg, setstatusMsg] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const globalAdminCount = useMemo(
    () =>
      directoryUsers.filter(
        (directoryUser) => directoryUser.globalRole === 'GLOBAL_ADMIN',
      ).length,
    [directoryUsers],
  );

  const updateAssignedRole = async (
    memberId: string,
    nextRole: GlobalRole,
  ): Promise<void> => {
    const targetUser = directoryUsers.find(
      (directoryUser) => directoryUser.id === memberId,
    );

    if (!targetUser) {
      return;
    }

    if (
      targetUser.globalRole === 'GLOBAL_ADMIN' &&
      nextRole !== 'GLOBAL_ADMIN' &&
      globalAdminCount <= 1
    ) {
      setstatusMsg('At least one global admin is required.');
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateGlobalRole(memberId, nextRole);
      setstatusMsg(`Updated global role for ${targetUser.name}.`);
    } catch (error) {
      setstatusMsg((error as Error).message || 'Failed to update global role.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentColumn}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Manage Global User Roles</h2>
              <p>
                Grant or revoke global admin access. Keep at least one global
                admin at all times.
              </p>
            </div>
          </div>

          {directoryUsers.length === 0 ? (
            <div className={styles.emptyMessage}>No users found.</div>
          ) : (
            <div className={styles.membersList}>
              {directoryUsers.map((directoryUser) => {
                const currentRole = directoryUser.globalRole ?? 'USER';
                const isCurrentUser = directoryUser.id === user.id;

                return (
                  <div key={directoryUser.id} className={styles.memberCard}>
                    <div className={styles.userIdentity}>
                      <div className={styles.userAvatar}>
                        {directoryUser.avatarUrl ? (
                          <img
                            src={directoryUser.avatarUrl}
                            alt={directoryUser.name}
                          />
                        ) : (
                          getInitials(directoryUser.name)
                        )}
                      </div>
                      <div>
                        <div className={styles.userName}>
                          {directoryUser.name}
                        </div>
                        <div className={styles.userEmail}>
                          {directoryUser.email}
                        </div>
                        {isCurrentUser && (
                          <div className={styles.userRoleMeta}>
                            This is your account.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.userRoleField}>
                      <select
                        value={currentRole}
                        disabled={isUpdating}
                        onChange={(event) =>
                          updateAssignedRole(
                            directoryUser.id,
                            event.target.value as GlobalRole,
                          )
                        }
                      >
                        {GLOBAL_ROLE_OPTIONS.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {statusMsg && <div className={styles.Message}>{statusMsg}</div>}
        </section>
      </div>
    </div>
  );
};

export default GlobalRoleManager;
