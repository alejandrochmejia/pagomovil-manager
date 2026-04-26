import { api } from './api';
import type { CuentaReceptora } from '@/types/pago';

interface CuentasState {
  data: CuentaReceptora[] | null;
  loading: boolean;
  error: Error | null;
  inflight: Promise<CuentaReceptora[]> | null;
}

let state: CuentasState = { data: null, loading: false, error: null, inflight: null };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCuentasSnapshot(): CuentasState {
  return state;
}

export function fetchCuentas(): Promise<CuentaReceptora[]> {
  if (state.inflight) return state.inflight;
  if (state.data) return Promise.resolve(state.data);

  state = { ...state, loading: true, error: null };
  emit();

  const promise = api<CuentaReceptora[]>('/cuentas')
    .then((data) => {
      state = { data, loading: false, error: null, inflight: null };
      emit();
      return data;
    })
    .catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      state = { ...state, loading: false, error, inflight: null };
      emit();
      throw error;
    });

  state = { ...state, inflight: promise };
  emit();
  return promise;
}

export function invalidateCuentas(): void {
  state = { data: null, loading: false, error: null, inflight: null };
  emit();
}
