import { api } from './api';
import { invalidateCuentas } from './cuentas.store';
import type { CuentaReceptora } from '@/types/pago';

export interface CuentasPagedResponse {
  items: CuentaReceptora[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export async function createCuenta(
  data: Omit<CuentaReceptora, 'id' | 'creado_en'>,
): Promise<CuentaReceptora> {
  const result = await api<CuentaReceptora>('/cuentas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  invalidateCuentas();
  return result;
}

export async function updateCuenta(
  id: number,
  data: Partial<Omit<CuentaReceptora, 'id' | 'creado_en'>>,
): Promise<CuentaReceptora> {
  const result = await api<CuentaReceptora>(`/cuentas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  invalidateCuentas();
  return result;
}

export async function deleteCuenta(id: number): Promise<void> {
  await api<void>(`/cuentas/${id}`, { method: 'DELETE' });
  invalidateCuentas();
}

export async function getAllCuentas(): Promise<CuentaReceptora[]> {
  return api<CuentaReceptora[]>('/cuentas');
}

export async function getCuentasPaginated(
  page = 1,
  pageSize = 25,
  search = '',
): Promise<CuentasPagedResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (search.trim()) params.set('q', search.trim());
  return api<CuentasPagedResponse>(`/cuentas?${params.toString()}`);
}
