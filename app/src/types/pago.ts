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
  cuenta_receptora_id?: number;
  imagen_uri?: string;
  creado_en?: string;
  actualizado_en?: string;
}

export interface CuentaReceptora {
  id?: number;
  nombre: string;
  banco: string;
  telefono: string;
  cedula: string;
  activa: boolean;
  creado_en?: string;
}
