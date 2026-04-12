import { api } from './api';
import type { Pago } from '@/types/pago';
import type { DateRange } from '@/types/common';

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

export async function getPagosByDateRange(range: DateRange): Promise<Pago[]> {
  return api<Pago[]>(`/pagos?desde=${range.from}&hasta=${range.to}`);
}

export async function getAllPagos(): Promise<Pago[]> {
  return api<Pago[]>('/pagos');
}
