import { api } from './api';
import type { CuentaReceptora } from '@/types/pago';

export async function createCuenta(
  data: Omit<CuentaReceptora, 'id' | 'creado_en'>,
): Promise<CuentaReceptora> {
  return api<CuentaReceptora>('/cuentas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCuenta(
  id: number,
  data: Partial<Omit<CuentaReceptora, 'id' | 'creado_en'>>,
): Promise<CuentaReceptora> {
  return api<CuentaReceptora>(`/cuentas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCuenta(id: number): Promise<void> {
  await api<void>(`/cuentas/${id}`, { method: 'DELETE' });
}

export async function getAllCuentas(): Promise<CuentaReceptora[]> {
  return api<CuentaReceptora[]>('/cuentas');
}
