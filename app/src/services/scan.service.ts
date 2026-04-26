import { api } from './api';
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
    return await api<ScanResponse>('/scan', {
      method: 'POST',
      body: JSON.stringify({ image: imageBase64 }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado. Intenta de nuevo.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
