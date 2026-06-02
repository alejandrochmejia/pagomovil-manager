import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
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

export async function exportPagosJson(range?: DateRange, search?: string): Promise<Blob> {
  return apiBlob(`/pagos/export.json${buildExportParams(range, search)}`);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const data = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title: filename,
      url: written.uri,
      dialogTitle: 'Guardar o compartir',
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
