import type { Pago, CuentaReceptora } from './pago';

export interface DateRange {
  from: string;
  to: string;
}

export interface ExportData {
  version: number;
  exportedAt: string;
  pagos: Pago[];
  cuentas: CuentaReceptora[];
}

export interface DashboardStats {
  totalHoy: number;
  totalMes: number;
  cantidadHoy: number;
  cantidadMes: number;
  promedioMes: number;
  pagosPorBanco: Array<{ banco: string; total: number; cantidad: number }>;
  pagosPorDia: Array<{ fecha: string; total: number; cantidad: number }>;
}

export interface N8nScanResponse {
  monto?: number;
  banco?: string;
  cedula?: string;
  telefono?: string;
  fecha?: string;
  hora?: string;
  referencia?: string;
  concepto?: string;
}

export interface ScanResponse {
  monto: number | null;
  comision: number | null;
  montoTotal: number | null;
  banco: string | null;
  cedula: string | null;
  telefono: string | null;
  fecha: string | null;
  hora: string | null;
  referencia: string | null;
  concepto: string | null;
}
