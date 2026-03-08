import { db } from '@/db/database';
import type { Pago } from '@/types/pago';
import type { DateRange } from '@/types/common';
import { nowISO } from '@/utils/format';

export async function createPago(
  data: Omit<Pago, 'id' | 'creadoEn' | 'actualizadoEn'>,
): Promise<number> {
  const now = nowISO();
  return db.pagos.add({ ...data, creadoEn: now, actualizadoEn: now });
}

export async function updatePago(
  id: number,
  data: Partial<Omit<Pago, 'id' | 'creadoEn'>>,
): Promise<void> {
  await db.pagos.update(id, { ...data, actualizadoEn: nowISO() });
}

export async function deletePago(id: number): Promise<void> {
  await db.pagos.delete(id);
}

export async function getPagosByDateRange(range: DateRange): Promise<Pago[]> {
  return db.pagos
    .where('fecha')
    .between(range.from, range.to, true, true)
    .reverse()
    .toArray();
}

export async function getAllPagos(): Promise<Pago[]> {
  return db.pagos.orderBy('fecha').reverse().toArray();
}

export async function checkDuplicateRef(referencia: string): Promise<boolean> {
  const count = await db.pagos.where('referencia').equals(referencia).count();
  return count > 0;
}
