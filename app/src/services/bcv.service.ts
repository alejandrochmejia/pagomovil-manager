const API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';
const STORAGE_KEY = 'pagomovil_bcv_rate';

export interface BcvRate {
  promedio: number;
  fechaActualizacion: string;
  fetchedAt: string;
}

export function getCachedRate(): BcvRate | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BcvRate;
  } catch {
    return null;
  }
}

export async function fetchBcvRate(): Promise<BcvRate> {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`Error al obtener tasa BCV: ${res.status}`);

  const data = await res.json();
  const rate: BcvRate = {
    promedio: data.promedio,
    fechaActualizacion: data.fechaActualizacion,
    fetchedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(rate));
  return rate;
}
