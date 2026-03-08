import { db } from '@/db/database';
import type { CuentaReceptora } from '@/types/pago';
import { nowISO } from '@/utils/format';

export async function createCuenta(
  data: Omit<CuentaReceptora, 'id' | 'creadoEn'>,
): Promise<number> {
  return db.cuentas.add({ ...data, creadoEn: nowISO() });
}

export async function updateCuenta(
  id: number,
  data: Partial<Omit<CuentaReceptora, 'id' | 'creadoEn'>>,
): Promise<void> {
  await db.cuentas.update(id, data);
}

export async function deleteCuenta(id: number): Promise<void> {
  await db.cuentas.delete(id);
}

export async function getAllCuentas(): Promise<CuentaReceptora[]> {
  return db.cuentas.toArray();
}

export async function getActiveCuentas(): Promise<CuentaReceptora[]> {
  return db.cuentas.filter((c) => c.activa).toArray();
}
