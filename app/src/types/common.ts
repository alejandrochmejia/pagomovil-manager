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
  sin_comprobante_total: number;
  no_coincidentes_total: number;
  meta_mes: number | null;
}

export interface StatsBreakdown {
  grupo: string;
  total: number;
  cantidad: number;
}

export interface StatsExtra {
  total_mes_anterior: number;
  cantidad_mes_anterior: number;
  ticket_promedio_historico: number;
}

export interface StatsMonthly {
  mes: string;
  total: number;
  cantidad: number;
}

export interface StatsRange {
  cantidad: number;
  total_scans: number;
  tiempo_promedio_ms: number;
  sin_comprobante: number;
  duplicados: number;
  transacciones_editadas: number;
}

export type KpiSection = 'resumen' | 'finanzas' | 'cuentas' | 'operaciones';

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
  banco_destino: string | null;
  cedula_destino: string | null;
  telefono_destino: string | null;
  scan_log_id?: number;
}
