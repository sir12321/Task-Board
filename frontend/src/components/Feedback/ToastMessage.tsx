import styles from './ToastMessage.module.css';

interface Props {
  message: string;
}

const ToastMessage = ({ message }: Props) => {
  return (
    <div className={styles.toast} role="status" aria-live="polite">
      {message}
    </div>
  );
};

export default ToastMessage;
