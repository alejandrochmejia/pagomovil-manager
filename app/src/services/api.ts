import { getToken, getEmpresaId } from './auth.service';

const BASE_URL = import.meta.env.VITE_SCAN_API_URL as string;

export async function api<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken();
  const empresaId = getEmpresaId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (empresaId) {
    headers['X-Empresa-Id'] = String(empresaId);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (options?.method === 'DELETE' && res.status === 204) {
    return undefined as T;
  }

  if (res.status === 401) {
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail ?? `Error ${res.status}`);
  }

  return res.json();
}
