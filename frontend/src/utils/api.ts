const BASE_URL = '/api';

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
    const defaultOptions: RequestInit = {
        credentials: 'include', // Include cookies for authentication
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...defaultOptions,
        ...options,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'API request failed');
    }

    return response.json();
};