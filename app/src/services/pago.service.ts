import { api } from './api';
import { invalidateStats } from './stats.cache';
import type { Pago } from '@/types/pago';
import type { DateRange } from '@/types/common';

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface DuplicateMatch {
  id: number;
  monto: number;
  banco: string;
  referencia: string;
  fecha: string;
  hora?: string;
  cedula: string;
  creado_en: string;
  match_type: 'referencia' | 'monto_fecha_cedula';
}

export interface CheckDuplicateResponse {
  duplicate: boolean;
  matches: DuplicateMatch[];
}

export interface DuplicadoGroup {
  banco: string;
  referencia: string;
  cantidad: number;
  pagos: Pago[];
}

export async function getDuplicados(): Promise<DuplicadoGroup[]> {
  return api<DuplicadoGroup[]>('/pagos/duplicados');
}

export async function checkDuplicatePago(params: {
  referencia: string;
  monto?: number;
  fecha?: string;
  cedula?: string;
}): Promise<CheckDuplicateResponse> {
  const q = new URLSearchParams({ referencia: params.referencia });
  if (params.monto != null && params.monto > 0) q.set('monto', String(params.monto));
  if (params.fecha) q.set('fecha', params.fecha);
  if (params.cedula) q.set('cedula', params.cedula);
  return api<CheckDuplicateResponse>(`/pagos/check-duplicate?${q.toString()}`);
}

export async function createPago(
  data: Omit<Pago, 'id' | 'creado_en' | 'actualizado_en'>,
): Promise<Pago> {
  const result = await api<Pago>('/pagos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  invalidateStats();
  return result;
}

export async function updatePago(
  id: number,
  data: Partial<Omit<Pago, 'id' | 'creado_en'>>,
): Promise<Pago> {
  const result = await api<Pago>(`/pagos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  invalidateStats();
  return result;
}

export async function deletePago(id: number): Promise<void> {
  await api<void>(`/pagos/${id}`, { method: 'DELETE' });
  invalidateStats();
}

export async function resolverNoCoincidente(id: number): Promise<Pago> {
  const result = await api<Pago>(`/pagos/${id}/resolver-no-coincidente`, { method: 'POST' });
  invalidateStats();
  return result;
}

export interface PagosListFilters {
  sinComprobante?: boolean;
  noCoincidentes?: boolean;
  estado?: string;
  duplicados?: boolean;
  editados?: boolean;
}

export async function getPagosByDateRange(
  range: DateRange,
  page = 1,
  pageSize = 25,
  search = '',
  opts: PagosListFilters = {},
): Promise<PagedResponse<Pago>> {
  const params = new URLSearchParams({
    desde: range.from,
    hasta: range.to,
    page: String(page),
    page_size: String(pageSize),
  });
  if (search.trim()) params.set('q', search.trim());
  if (opts.sinComprobante) params.set('sin_comprobante', 'true');
  if (opts.noCoincidentes) params.set('no_coincidentes', 'true');
  if (opts.estado) params.set('estado', opts.estado);
  if (opts.duplicados) params.set('duplicados', 'true');
  if (opts.editados) params.set('editados', 'true');
  return api<PagedResponse<Pago>>(`/pagos?${params.toString()}`);
}
