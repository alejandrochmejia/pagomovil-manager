import { api } from './api';
import type { Pago } from '@/types/pago';
import type { DateRange } from '@/types/common';

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export async function createPago(
  data: Omit<Pago, 'id' | 'creado_en' | 'actualizado_en'>,
): Promise<Pago> {
  return api<Pago>('/pagos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePago(
  id: number,
  data: Partial<Omit<Pago, 'id' | 'creado_en'>>,
): Promise<Pago> {
  return api<Pago>(`/pagos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePago(id: number): Promise<void> {
  await api<void>(`/pagos/${id}`, { method: 'DELETE' });
}

export async function getPagosByDateRange(
  range: DateRange,
  page = 1,
  pageSize = 25,
): Promise<PagedResponse<Pago>> {
  return api<PagedResponse<Pago>>(
    `/pagos?desde=${range.from}&hasta=${range.to}&page=${page}&page_size=${pageSize}`,
  );
}

export async function getAllPagos(): Promise<Pago[]> {
  const all: Pago[] = [];
  let page = 1;
  while (true) {
    const res = await api<PagedResponse<Pago>>(`/pagos?page=${page}&page_size=200`);
    all.push(...res.items);
    if (!res.has_more) break;
    page += 1;
  }
  return all;
}
