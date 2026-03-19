const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const BASE_URL = configuredBaseUrl
  ? configuredBaseUrl.replace(/\/$/, '')
  : '/api';

export const apiClient = async (
  endpoint: string,
  options: RequestInit = {},
) => {
  const normalizedEndpoint = endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`;

  const defaultOptions: RequestInit = {
    credentials: 'include', // Include cookies for authentication
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      ...options.headers,
    },
  };

  const response = await fetch(`${BASE_URL}${normalizedEndpoint}`, {
    ...defaultOptions,
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || errorData.message || 'API request failed',
    );
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};
