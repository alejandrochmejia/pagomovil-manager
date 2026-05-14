import { api } from './api';
import type { ScanResponse } from '@/types/common';

export function isScanConfigured(): boolean {
  return true;
}

export async function scanReceipt(imageBase64: string): Promise<ScanResponse> {
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
