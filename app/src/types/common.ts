export interface DateRange {
  from: string;
  to: string;
}

export interface StatsSummary {
  total_hoy: number;
  cantidad_hoy: number;
  total_ayer: number;
  cantidad_ayer: number;
  total_semana: number;
  cantidad_semana: number;
  total_semana_anterior: number;
  cantidad_semana_anterior: number;
  total_mes: number;
  cantidad_mes: number;
  promedio_ticket: number;
  duplicados_hoy: number;
  transacciones_editadas: number;
  transacciones_anuladas: number;
  pendientes_revision: number;
  meta_mes: number | null;
}

export interface StatsBreakdown {
  grupo: string;
  total: number;
  cantidad: number;
}

export interface ScanStats {
  tasa_rechazo: number;
  tiempo_promedio_ms: number;
  tasa_correccion: number;
  total_scans: number;
}

export type KpiSection = 'resumen' | 'finanzas' | 'bancos' | 'operaciones' | 'riesgo';

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
