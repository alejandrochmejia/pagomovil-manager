import { getToken, getEmpresaId } from './auth.service';

const BASE_URL = import.meta.env.VITE_SCAN_API_URL as string;

function buildHeaders(extra?: HeadersInit, includeJsonContentType = true): Record<string, string> {
  const token = getToken();
  const empresaId = getEmpresaId();
  const headers: Record<string, string> = {
    ...(includeJsonContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(extra as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (empresaId) headers['X-Empresa-Id'] = String(empresaId);
  return headers;
}

export async function api<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options?.headers),
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

export async function apiBlob(path: string, options?: RequestInit): Promise<Blob> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options?.headers, false),
  });

  if (res.status === 401) {
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    throw new Error(`Error ${res.status}`);
  }

  return res.blob();
}
