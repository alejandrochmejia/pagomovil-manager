import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyBs(amount: number): string {
  return `Bs. ${formatCurrency(amount)}`;
}

export function formatCurrencyUsd(amount: number): string {
  return `$ ${formatCurrency(amount)}`;
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: es });
}

export function formatDateLong(dateStr: string): string {
  return format(parseISO(dateStr), "d 'de' MMMM, yyyy", { locale: es });
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm', { locale: es });
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function nowISO(): string {
  return new Date().toISOString();
}
