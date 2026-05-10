import type { CuentaReceptora } from '@/types/pago';
import { BANCOS } from './constants';

const DIACRITICS_RE = /[̀-ͯ]/g;

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS_RE, '');
}

function normalizeBanco(s: string | null | undefined): string {
  if (!s) return '';
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/\bbanco\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function normalizeDigits(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/\D/g, '');
}

function bancoMatches(scanBanco: string | null | undefined, cuentaBanco: string): boolean {
  const a = normalizeBanco(scanBanco);
  const b = normalizeBanco(cuentaBanco);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function phoneMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = normalizeDigits(a);
  const db = normalizeDigits(b);
  if (!da || !db) return false;
  return da.slice(-10) === db.slice(-10);
}

function cedulaMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = normalizeDigits(a);
  const db = normalizeDigits(b);
  if (!da || !db) return false;
  return da === db;
}

export interface ScanReceptor {
  banco: string | null;
  telefono: string | null;
  cedula: string | null;
}

export function findMatchingCuenta(
  cuentas: CuentaReceptora[],
  receptor: ScanReceptor,
): CuentaReceptora | undefined {
  const candidates = cuentas.filter((c) => c.activa !== false);

  const exact = candidates.find(
    (c) =>
      bancoMatches(receptor.banco, c.banco) &&
      (phoneMatches(receptor.telefono, c.telefono) ||
        cedulaMatches(receptor.cedula, c.cedula)),
  );
  if (exact) return exact;

  return candidates.find(
    (c) =>
      phoneMatches(receptor.telefono, c.telefono) ||
      cedulaMatches(receptor.cedula, c.cedula),
  );
}

export function findClosestBanco(scanBanco: string | null | undefined): string {
  if (!scanBanco) return '';
  const normalized = normalizeBanco(scanBanco);
  if (!normalized) return '';
  const exact = BANCOS.find((b) => normalizeBanco(b.nombre) === normalized);
  if (exact) return exact.nombre;
  const partial = BANCOS.find((b) => {
    const nb = normalizeBanco(b.nombre);
    return nb && (normalized.includes(nb) || nb.includes(normalized));
  });
  return partial?.nombre ?? '';
}

export function hasReceptorData(receptor: ScanReceptor): boolean {
  return !!(receptor.banco || receptor.telefono || receptor.cedula);
}
