import { api } from './api';

const API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';
const STORAGE_KEY = 'pagomovil_bcv_rate';

export interface BcvRate {
  promedio: number;
  fechaActualizacion: string;
  fetchedAt: string;
}

export interface BcvHistoricalRate {
  fecha: string;
  promedio: number;
  fetched_at?: string;
}

function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function getCachedRate(): BcvRate | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BcvRate;
    if (!parsed || !Number.isFinite(parsed.promedio) || parsed.promedio <= 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function persistRate(fecha: string, promedio: number): Promise<void> {
  try {
    await api('/bcv-rates', {
      method: 'POST',
      body: JSON.stringify({ fecha, promedio }),
    });
  } catch {
    // Silencioso: no debe romper la UI si la persistencia falla.
  }
}

export async function fetchBcvRate(): Promise<BcvRate> {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`Error al obtener tasa BCV: ${res.status}`);

  const data = await res.json();
  const promedio = Number(data?.promedio);
  const fechaActualizacion = data?.fechaActualizacion;
  if (!Number.isFinite(promedio) || promedio <= 0 || typeof fechaActualizacion !== 'string') {
    throw new Error('La tasa BCV recibida no es valida');
  }
  const rate: BcvRate = {
    promedio,
    fechaActualizacion,
    fetchedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(rate));
  await persistRate(toDateOnly(rate.fechaActualizacion), rate.promedio);
  return rate;
}

export async function getBcvRatesByRange(
  desde: string,
  hasta: string,
): Promise<BcvHistoricalRate[]> {
  const params = new URLSearchParams({ desde, hasta });
  return api<BcvHistoricalRate[]>(`/bcv-rates?${params.toString()}`);
}
