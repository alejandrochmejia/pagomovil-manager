export type TipoCedula = 'V' | 'J' | 'E' | 'G';

export interface Pago {
  id?: number;
  monto: number;
  banco: string;
  cedula: string;
  telefono?: string;
  fecha: string;
  hora?: string;
  referencia: string;
  concepto?: string;
  cuentaReceptoraId?: number;
  imagenUri?: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CuentaReceptora {
  id?: number;
  nombre: string;
  banco: string;
  telefono: string;
  cedula: string;
  activa: boolean;
  creadoEn: string;
}
