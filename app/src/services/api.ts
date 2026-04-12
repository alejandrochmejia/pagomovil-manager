const BASE_URL = import.meta.env.VITE_SCAN_API_URL as string;

export async function api<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (options?.method === 'DELETE' && res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail ?? `Error ${res.status}`);
  }

  return res.json();
}
