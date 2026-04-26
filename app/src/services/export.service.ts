import { apiBlob } from './api';
import type { DateRange } from '@/types/common';

export async function exportPagosCsv(range?: DateRange, search?: string): Promise<Blob> {
  const params = new URLSearchParams();
  if (range) {
    params.set('desde', range.from);
    params.set('hasta', range.to);
  }
  if (search?.trim()) params.set('q', search.trim());
  const qs = params.toString();
  return apiBlob(`/pagos/export.csv${qs ? `?${qs}` : ''}`);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
