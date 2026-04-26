import { apiBlob } from './api';
import type { DateRange } from '@/types/common';

function buildExportParams(range?: DateRange, search?: string): string {
  const params = new URLSearchParams();
  if (range) {
    params.set('desde', range.from);
    params.set('hasta', range.to);
  }
  if (search?.trim()) params.set('q', search.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function exportPagosCsv(range?: DateRange, search?: string): Promise<Blob> {
  return apiBlob(`/pagos/export.csv${buildExportParams(range, search)}`);
}

export async function exportPagosPdf(range?: DateRange, search?: string): Promise<Blob> {
  return apiBlob(`/pagos/export.pdf${buildExportParams(range, search)}`);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
