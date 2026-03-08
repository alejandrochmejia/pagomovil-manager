import { TIPOS_CEDULA } from './constants';

export function isValidCedula(cedula: string): boolean {
  const pattern = new RegExp(`^[${TIPOS_CEDULA.join('')}]-\\d{5,9}$`);
  return pattern.test(cedula.toUpperCase());
}

export function isValidPhone(phone: string): boolean {
  return /^04\d{2}-?\d{7}$/.test(phone);
}

export function isValidReferencia(ref: string): boolean {
  return /^\d{4,20}$/.test(ref);
}

export function isValidMonto(monto: number): boolean {
  return monto > 0 && isFinite(monto);
}

export function normalizeCedula(cedula: string): string {
  return cedula.toUpperCase().replace(/\s/g, '');
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '').replace(/^(\d{4})(\d{7})$/, '$1-$2');
}
