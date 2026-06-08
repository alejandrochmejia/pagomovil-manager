const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export interface AuthUser {
  id: string;
  email: string;
  nombre?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
}

export interface Empresa {
  id: number;
  nombre: string;
  rol: string;
  creado_en?: string;
}

interface AuthResponse {
  user: AuthUser;
  session: AuthSession;
}

async function authFetch<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail ?? `Error ${res.status}`);
  }
  return res.json();
}

export async function register(email: string, password: string, nombre: string): Promise<AuthResponse> {
  return authFetch<AuthResponse>('/auth/register', { email, password, nombre });
}

export async function login(email: string, password: string): Promise<AuthResponse & { user: AuthUser & { nombre: string } }> {
  return authFetch('/auth/login', { email, password });
}

export async function resetPassword(email: string): Promise<{ message: string }> {
  return authFetch('/auth/reset-password', { email });
}

export async function getMe(token: string): Promise<{ user: AuthUser; empresas: Empresa[] }> {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Sesión inválida');
  return res.json();
}

// localStorage keys
const TOKEN_KEY = 'pagomovil_token';
const REFRESH_KEY = 'pagomovil_refresh';
const EMPRESA_KEY = 'pagomovil_empresa_id';

export function saveSession(session: AuthSession) {
  if (session.access_token) {
    localStorage.setItem(TOKEN_KEY, session.access_token);
  }
  if (session.refresh_token) {
    localStorage.setItem(REFRESH_KEY, session.refresh_token);
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getEmpresaId(): number | null {
  const val = localStorage.getItem(EMPRESA_KEY);
  return val ? Number(val) : null;
}

export function setEmpresaId(id: number) {
  localStorage.setItem(EMPRESA_KEY, String(id));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EMPRESA_KEY);
}

// --- Refresh de sesión ---

let refreshInFlight: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refresh_token = localStorage.getItem(REFRESH_KEY);
  if (!refresh_token) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string; refresh_token: string };
    saveSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Intenta renovar el access_token con el refresh_token almacenado.
 * Deduplica llamadas concurrentes (varias requests con 401 a la vez comparten
 * el mismo refresh). Devuelve el nuevo access_token o null si no se pudo.
 */
export function refreshSession(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// --- Notificación de sesión expirada ---

let onSessionExpired: (() => void) | null = null;

/** Registra el callback que se invoca cuando la sesión expira sin remedio. */
export function setOnSessionExpired(fn: (() => void) | null) {
  onSessionExpired = fn;
}

/** Limpia la sesión y notifica al provider para redirigir al login. */
export function handleSessionExpired() {
  clearSession();
  onSessionExpired?.();
}
