const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const BASE_URL = configuredBaseUrl
  ? configuredBaseUrl.replace(/\/$/, '')
  : '/api';

interface UploadAvatarResponse {
  avatarUrl?: string | null;
  user?: {
    avatarUrl?: string | null;
  };
}

export const uploadUserAvatar = async (file: File): Promise<string | null> => {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetch(`${BASE_URL}/users/me/avatar`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || errorData.message || 'Failed to upload avatar.',
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  const data = (await response.json()) as UploadAvatarResponse;
  return data.user?.avatarUrl ?? data.avatarUrl ?? null;
};
