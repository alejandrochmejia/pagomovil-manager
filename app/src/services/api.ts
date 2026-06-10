import { getToken, getEmpresaId, refreshSession, handleSessionExpired } from './auth.service';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

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

// FastAPI devuelve `detail` como string (HTTPException) o como lista de objetos
// {loc, msg, type} en errores de validación (422). Construye un mensaje legible
// para ambos casos en vez de mostrar "[object Object]".
function extractApiError(err: unknown, status: number): string {
  const detail = (err as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => {
        const item = d as { loc?: unknown[]; msg?: string };
        const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : undefined;
        return field && item.msg ? `${field}: ${item.msg}` : item.msg;
      })
      .filter(Boolean);
    if (msgs.length) return msgs.join(' · ');
  }
  return `Error ${status}`;
}

export async function api<T>(
  path: string,
  options?: RequestInit,
  isRetry = false,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options?.headers),
  });

  if (options?.method === 'DELETE' && res.status === 204) {
    return undefined as T;
  }

  if (res.status === 401) {
    // Token expirado: intentar renovar una vez y reintentar la request.
    if (!isRetry) {
      const newToken = await refreshSession();
      if (newToken) return api<T>(path, options, true);
    }
    handleSessionExpired();
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(extractApiError(err, res.status));
  }

  return res.json();
}

export async function apiBlob(path: string, options?: RequestInit, isRetry = false): Promise<Blob> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options?.headers, false),
  });

  if (res.status === 401) {
    if (!isRetry) {
      const newToken = await refreshSession();
      if (newToken) return apiBlob(path, options, true);
    }
    handleSessionExpired();
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    throw new Error(`Error ${res.status}`);
  }

  return res.blob();
}
