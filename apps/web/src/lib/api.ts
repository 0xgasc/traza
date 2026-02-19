const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApiError {
  message: string;
  statusCode: number;
}

class ApiClientError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
  }
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('traza_access_token');
}

function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('traza_access_token', token);
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('traza_refresh_token');
}

function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('traza_refresh_token', token);
}

function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('traza_access_token');
  localStorage.removeItem('traza_refresh_token');
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.accessToken || data.access_token;
    const newRefreshToken = data.refreshToken || data.refresh_token;

    if (newAccessToken) setAccessToken(newAccessToken);
    if (newRefreshToken) setRefreshToken(newRefreshToken);

    return newAccessToken || null;
  } catch {
    clearTokens();
    return null;
  }
}

async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Auto-refresh on 401
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });
    } else {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiClientError('Session expired. Please log in again.', 401);
    }
  }

  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;
    try {
      const errorData = await res.json();
      // API returns { error: { message, details } } shape
      const nested = errorData?.error;
      if (nested?.details?.length) {
        // Use first Zod issue's message for validation errors
        errorMessage = nested.details[0]?.message || nested.message || errorMessage;
      } else {
        errorMessage = nested?.message || (errorData as ApiError).message || errorMessage;
      }
    } catch {
      // response body not JSON
    }
    throw new ApiClientError(errorMessage, res.status);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export async function apiPost<T = unknown>(
  path: string,
  body?: unknown
): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPatch<T = unknown>(
  path: string,
  body?: unknown
): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    let errorMessage = `Upload failed with status ${res.status}`;
    try {
      const errorData = await res.json();
      const nested = errorData?.error;
      errorMessage = nested?.message || (errorData as ApiError).message || errorMessage;
    } catch {
      // ignore
    }
    throw new ApiClientError(errorMessage, res.status);
  }

  return res.json() as Promise<T>;
}

export {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
  ApiClientError,
};
