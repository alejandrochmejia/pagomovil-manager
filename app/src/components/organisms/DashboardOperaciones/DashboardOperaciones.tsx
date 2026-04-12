import type { StatsSummary, ScanStats } from '@/types/common';
import { IconSettings } from '@tabler/icons-react';
import KpiSection from '@/components/molecules/KpiSection/KpiSection';
import StatCard from '@/components/molecules/StatCard/StatCard';
import AlertCard from '@/components/molecules/AlertCard/AlertCard';
import styles from './DashboardOperaciones.module.css';

interface DashboardOperacionesProps {
  summary: StatsSummary;
  scanStats: ScanStats | null;
}

export default function DashboardOperaciones({
  summary,
  scanStats,
}: DashboardOperacionesProps) {
  return (
    <KpiSection
      title="KPIs Operativos"
      subtitle="Que tan bien opera el proceso?"
      icon={<IconSettings size={20} stroke={1.5} />}
    >
      <div className={styles.grid}>
        <StatCard
          label="Transacciones hoy"
          value={String(summary.cantidad_hoy)}
          sublabel="pagos registrados"
        />
        <StatCard
          label="Total scans"
          value={String(scanStats?.total_scans ?? 0)}
          sublabel="comprobantes procesados"
        />
      </div>

      {scanStats && scanStats.total_scans > 0 && (
        <div className={styles.alertGrid}>
          <AlertCard
            title="Tasa de rechazo"
            value={`${scanStats.tasa_rechazo}%`}
            description="Comprobantes ilegibles"
            variant={scanStats.tasa_rechazo > 20 ? 'danger' : scanStats.tasa_rechazo > 10 ? 'warning' : 'success'}
          />
          <AlertCard
            title="Tiempo promedio"
            value={`${(scanStats.tiempo_promedio_ms / 1000).toFixed(1)}s`}
            description="Por comprobante"
            variant={scanStats.tiempo_promedio_ms > 10000 ? 'warning' : 'info'}
          />
          <AlertCard
            title="Correccion manual"
            value={`${scanStats.tasa_correccion}%`}
            description="Campos corregidos post-OCR"
            variant={scanStats.tasa_correccion > 30 ? 'warning' : 'success'}
          />
        </div>
      )}
    </KpiSection>
  );
}
