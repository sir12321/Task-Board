import { getInitials } from '../../utils/getInitials';
import styles from './UserSettingsManager.module.css';

interface Props {
  name: string;
  avatarUrl?: string | null;
  onImageClick: () => void;
}

const UserSettingsHeader = ({ name, avatarUrl, onImageClick }: Props) => {
  return (
    <section className={styles.hero}>
      <button
        type="button"
        className={styles.avatarButton}
        onClick={onImageClick}
        title="Upload image"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={`${name} avatar`} className={styles.avatar} />
        ) : (
          <div className={styles.avatarFallback}>{getInitials(name)}</div>
        )}
      </button>
      <h1 className={styles.userName}>{name}</h1>
      <p className={styles.imageHint}>Click image to upload new photo</p>
    </section>
  );
};

export default UserSettingsHeader;
