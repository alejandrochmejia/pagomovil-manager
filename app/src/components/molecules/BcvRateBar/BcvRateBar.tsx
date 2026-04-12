import { IconRefresh } from '@tabler/icons-react';
import type { BcvRate } from '@/services/bcv.service';
import { formatCurrency } from '@/utils/format';
import styles from './BcvRateBar.module.css';

interface BcvRateBarProps {
  rate: BcvRate | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

function formatRateDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function BcvRateBar({ rate, loading, error, onRefresh }: BcvRateBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.info}>
        <span className={styles.label}>Tasa BCV</span>
        {rate ? (
          <span className={styles.rate}>
            Bs. {formatCurrency(rate.promedio)} / USD
          </span>
        ) : error ? (
          <span className={styles.error}>{error}</span>
        ) : (
          <span className={styles.placeholder}>Cargando...</span>
        )}
        {rate && (
          <span className={styles.date}>
            Actualizado: {formatRateDate(rate.fechaActualizacion)}
          </span>
        )}
      </div>
      <button
        className={`${styles.syncBtn} ${loading ? styles.spinning : ''}`}
        onClick={onRefresh}
        disabled={loading}
        aria-label="Sincronizar tasa"
      >
        <IconRefresh size={18} stroke={1.5} />
      </button>
    </div>
  );
}
