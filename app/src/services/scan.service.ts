import type { ScanResponse } from '@/types/common';

const API_URL = import.meta.env.VITE_SCAN_API_URL as string | undefined;

export function isScanConfigured(): boolean {
  return !!API_URL;
}

export async function scanReceipt(imageBase64: string): Promise<ScanResponse> {
  if (!API_URL) {
    throw new Error('URL del servidor de escaneo no configurada. Define VITE_SCAN_API_URL en .env');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${API_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail ?? `Error del servidor: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado. Intenta de nuevo.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
