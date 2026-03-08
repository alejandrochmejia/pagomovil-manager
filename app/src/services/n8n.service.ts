import type { N8nScanResponse } from '@/types/common';

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined;

export function isWebhookConfigured(): boolean {
  return !!WEBHOOK_URL;
}

export async function scanReceipt(imageBase64: string): Promise<N8nScanResponse> {
  if (!WEBHOOK_URL) {
    throw new Error('Webhook no configurado. Define VITE_N8N_WEBHOOK_URL en el archivo .env');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
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
