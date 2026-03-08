import Dexie, { type Table } from 'dexie';
import type { Pago, CuentaReceptora } from '@/types/pago';

export class PagoMovilDB extends Dexie {
  pagos!: Table<Pago, number>;
  cuentas!: Table<CuentaReceptora, number>;

  constructor() {
    super('PagoMovilDB');

    this.version(1).stores({
      pagos: '++id, fecha, banco, cedula, referencia, [fecha+banco]',
      cuentas: '++id, banco, telefono, cedula',
    });
  }
}

export const db = new PagoMovilDB();
