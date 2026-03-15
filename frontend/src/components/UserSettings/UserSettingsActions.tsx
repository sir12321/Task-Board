import styles from './UserSettingsManager.module.css';

interface Props {
  onChangeName: () => void;
  onChangePassword: () => void;
  nameStatus: string;
  passwordStatus: string;
}

const UserSettingsActions = ({
  onChangeName,
  onChangePassword,
  nameStatus,
  passwordStatus,
}: Props) => {
  return (
    <section className={styles.optionsPanel}>
      <div className={styles.actions}>
        <button className={styles.button} type="button" onClick={onChangeName}>
          Change Name
        </button>
        <button
          className={styles.button}
          type="button"
          onClick={onChangePassword}
        >
          Change Password
        </button>
      </div>
      {nameStatus && <p className={styles.status}>{nameStatus}</p>}
      {passwordStatus && <p className={styles.status}>{passwordStatus}</p>}
    </section>
  );
};

export default UserSettingsActions;
