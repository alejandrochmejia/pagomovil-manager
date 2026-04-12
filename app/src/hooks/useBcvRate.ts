import { useState, useEffect, useCallback } from 'react';
import { fetchBcvRate, getCachedRate, type BcvRate } from '@/services/bcv.service';

export function useBcvRate() {
  const [rate, setRate] = useState<BcvRate | null>(getCachedRate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetchBcvRate();
      setRate(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rate, loading, error, refresh } as const;
}
