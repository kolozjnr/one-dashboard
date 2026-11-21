import { apiRequest, clearApiCsrfToken } from '@/lib/api-client';
import { setFlash } from '@/lib/flash';

export async function logout(): Promise<void> {
  try {
    await apiRequest<{ message: string }>('auth/logout', { method: 'POST' });
  } finally {
    clearApiCsrfToken();
    setFlash('Successfully logged out.');
    window.location.href = '/login';
  }
}
