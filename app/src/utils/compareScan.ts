import type { ScanResponse } from '@/types/common';

function digits(s: string | number | null | undefined): string {
  if (s == null) return '';
  return String(s).replace(/\D/g, '');
}

function toNum(v: number | string | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export interface PagoComparable {
  monto?: number | null;
  referencia?: string | null;
  cedula?: string | null;
}

export interface CompareResult {
  noCoincide: boolean;
  campos: string[];
}

/**
 * Espejo (NO autoritativo) de compare_scan_to_pago del backend, solo para mostrar
 * la alerta pre-guardado. La fuente de verdad es el flag que devuelve el servidor.
 * Reglas: referencia + monto (tolerancia 1%) + cédula. Banco/fecha no cuentan.
 * Un campo solo se compara si ambos lados tienen valor.
 */
export function compareScanToPago(scan: ScanResponse, pago: PagoComparable): CompareResult {
  const campos: string[] = [];

  const refScan = digits(scan.referencia);
  const refPago = digits(pago.referencia);
  if (refScan && refPago && refScan !== refPago) campos.push('referencia');

  const montoScan = toNum(scan.monto);
  const montoPago = toNum(pago.monto);
  if (montoScan != null && montoPago != null) {
    if (Math.abs(montoScan - montoPago) > 0.01 * Math.max(montoScan, montoPago, 1)) {
      campos.push('monto');
    }
  }

  const cedScan = digits(scan.cedula);
  const cedPago = digits(pago.cedula);
  if (cedScan && cedPago && cedScan !== cedPago) campos.push('cedula');

  return { noCoincide: campos.length > 0, campos };
}

const FIELD_LABELS: Record<string, string> = {
  referencia: 'Referencia',
  monto: 'Monto',
  cedula: 'Cédula',
};

export function describeMismatch(campos: string[]): string {
  return campos.map((c) => FIELD_LABELS[c] ?? c).join(', ');
}
