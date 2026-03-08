import { db } from '@/db/database';
import type { ExportData } from '@/types/common';
import { nowISO } from '@/utils/format';

const EXPORT_VERSION = 1;

function stripId<T extends { id?: number }>(obj: T): Omit<T, 'id'> {
  const { id, ...rest } = obj;
  void id;
  return rest;
}

export async function buildExportData(): Promise<ExportData> {
  const [pagos, cuentas] = await Promise.all([
    db.pagos.toArray(),
    db.cuentas.toArray(),
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

export async function applyImport(
  data: ExportData,
  strategy: 'merge' | 'replace',
): Promise<{ pagosImported: number; cuentasImported: number }> {
  if (strategy === 'replace') {
    await db.transaction('rw', db.pagos, db.cuentas, async () => {
      await db.pagos.clear();
      await db.cuentas.clear();
      await db.pagos.bulkAdd(data.pagos.map((p) => stripId(p)));
      await db.cuentas.bulkAdd(data.cuentas.map((c) => stripId(c)));
    });
    localStorage.setItem('pagomovil_last_export', data.exportedAt);
    return { pagosImported: data.pagos.length, cuentasImported: data.cuentas.length };
  }

  // Merge strategy: skip duplicates by referencia
  let pagosImported = 0;
  let cuentasImported = 0;

  await db.transaction('rw', db.pagos, db.cuentas, async () => {
    for (const pago of data.pagos) {
      const exists = await db.pagos.where('referencia').equals(pago.referencia).count();
      if (exists === 0) {
        await db.pagos.add(stripId(pago));
        pagosImported++;
      }
    }

    for (const cuenta of data.cuentas) {
      const exists = await db.cuentas
        .where('cedula')
        .equals(cuenta.cedula)
        .and((c) => c.banco === cuenta.banco)
        .count();
      if (exists === 0) {
        await db.cuentas.add(stripId(cuenta));
        cuentasImported++;
      }
    }
  });

  localStorage.setItem('pagomovil_last_export', data.exportedAt);
  return { pagosImported, cuentasImported };
}
