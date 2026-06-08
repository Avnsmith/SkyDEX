import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Custom fetch client that injects Supabase JWT token automatically.
 */
async function fetchClient(endpoint: string, options: RequestInit = {}) {
  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token;

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set Content-Type to JSON unless we are uploading a file (multipart)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'API request failed';
    try {
      const errBody = await response.json();
      errorMsg = errBody.message || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  // Handle binary streams for file downloads
  const contentType = response.headers.get('Content-Type');
  if (contentType && !contentType.includes('application/json')) {
    const blob = await response.blob();
    const filename = response.headers.get('Content-Disposition')
      ?.split('filename=')[1]
      ?.replace(/"/g, '') || 'downloaded-file';
    return { blob, filename };
  }

  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

export const api = {
  get: (endpoint: string, options?: RequestInit) => fetchClient(endpoint, { ...options, method: 'GET' }),
  post: (endpoint: string, body?: any, options?: RequestInit) =>
    fetchClient(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: (endpoint: string, body?: any, options?: RequestInit) =>
    fetchClient(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (endpoint: string, options?: RequestInit) => fetchClient(endpoint, { ...options, method: 'DELETE' }),
};
