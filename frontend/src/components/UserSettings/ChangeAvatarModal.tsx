import type { SyntheticEvent } from 'react';

interface Props {
  open: boolean;
  avatarUrl: string;
  error: string;
  onClose: () => void;
  onAvatarUrlChange: (url: string) => void;
  onSubmit: (e: SyntheticEvent) => Promise<void> | void;
}

const ChangeAvatarModal = ({
  open,
  avatarUrl,
  error,
  onClose,
  onAvatarUrlChange,
  onSubmit,
}: Props) => {
  if (!open) {
    return null;
  }

  return (
    <div onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-avatar-title"
      >
        <h2 id="change-avatar-title">Update Avatar</h2>
        <form onSubmit={onSubmit}>
          <label htmlFor="change-avatar-url">Avatar URL</label>
          <input
            id="change-avatar-url"
            type="url"
            value={avatarUrl}
            onChange={(e) => onAvatarUrlChange(e.target.value)}
            placeholder="Paste image URL here..."
          />
          {error && (
            <p role="alert" aria-live="assertive">
              {error}
            </p>
          )}
          <button type="submit">Save</button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangeAvatarModal;
