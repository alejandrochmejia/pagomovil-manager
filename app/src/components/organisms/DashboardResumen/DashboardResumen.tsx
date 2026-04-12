import type { StatsSummary } from '@/types/common';
import type { BcvRate } from '@/services/bcv.service';
import BcvRateBar from '@/components/molecules/BcvRateBar/BcvRateBar';
import StatCard from '@/components/molecules/StatCard/StatCard';
import styles from './DashboardResumen.module.css';

interface DashboardResumenProps {
  summary: StatsSummary;
  rate: BcvRate | null;
  rateLoading: boolean;
  rateError: string;
  onRefreshRate: () => void;
  fmt: (n: number) => string;
}

export default function DashboardResumen({
  summary,
  rate,
  rateLoading,
  rateError,
  onRefreshRate,
  fmt,
}: DashboardResumenProps) {
  return (
    <div className={styles.container}>
      <BcvRateBar
        rate={rate}
        loading={rateLoading}
        error={rateError}
        onRefresh={onRefreshRate}
      />

      <div className={styles.grid}>
        <StatCard
          label="Ingresos hoy"
          value={fmt(summary.total_hoy)}
          sublabel={`${summary.cantidad_hoy} pagos`}
        />
        <StatCard
          label="Este mes"
          value={fmt(summary.total_mes)}
          sublabel={`${summary.cantidad_mes} pagos`}
        />
        <StatCard
          label="Ticket promedio"
          value={fmt(summary.promedio_ticket)}
          sublabel="por transaccion"
        />
      </div>
    </div>
  );
}
