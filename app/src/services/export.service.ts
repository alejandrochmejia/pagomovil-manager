import { getAllPagos } from './pago.service';
import { getAllCuentas } from './cuenta.service';
import type { ExportData } from '@/types/common';
import { nowISO } from '@/utils/format';

const EXPORT_VERSION = 1;

export async function buildExportData(): Promise<ExportData> {
  const [pagos, cuentas] = await Promise.all([
    getAllPagos(),
    getAllCuentas(),
  ]);

  return {
    version: EXPORT_VERSION,
    exportedAt: nowISO(),
    pagos,
    cuentas,
  };
}

export function exportToJson(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

export function downloadJson(jsonStr: string, filename: string): void {
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportData(jsonStr: string): ExportData {
  const data = JSON.parse(jsonStr);
  if (!data.version || !Array.isArray(data.pagos) || !Array.isArray(data.cuentas)) {
    throw new Error('Formato de archivo inválido');
  }
  return data as ExportData;
}

export function isImportOlder(importData: ExportData): boolean {
  const existingLatest = localStorage.getItem('pagomovil_last_export');
  if (!existingLatest) return false;
  return importData.exportedAt < existingLatest;
}
