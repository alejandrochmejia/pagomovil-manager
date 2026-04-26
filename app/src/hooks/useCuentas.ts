import { useSyncExternalStore, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  subscribe,
  getCuentasSnapshot,
  fetchCuentas,
  invalidateCuentas,
} from '@/services/cuentas.store';
import type { CuentaReceptora } from '@/types/pago';

const EMPTY: CuentaReceptora[] = [];

export function useCuentas() {
  const { empresaId } = useAuth();
  const state = useSyncExternalStore(subscribe, getCuentasSnapshot, getCuentasSnapshot);
  const lastEmpresaRef = useRef<number | null>(empresaId);

  useEffect(() => {
    if (lastEmpresaRef.current !== empresaId) {
      invalidateCuentas();
      lastEmpresaRef.current = empresaId;
    }
    if (empresaId && state.data === null && !state.loading && !state.error) {
      fetchCuentas().catch(() => {});
    }
  }, [empresaId, state.data, state.loading, state.error]);

  const refresh = useCallback(() => {
    invalidateCuentas();
    return fetchCuentas();
  }, []);

  return {
    cuentas: state.data ?? EMPTY,
    loading: state.loading,
    error: state.error,
    refresh,
  };
}
