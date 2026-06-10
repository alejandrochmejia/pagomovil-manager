import type { StatsRange, DateRange } from '@/types/common';
import { useNavigate } from 'react-router-dom';
import { IconSettings } from '@tabler/icons-react';
import KpiSection from '@/components/molecules/KpiSection/KpiSection';
import StatCard from '@/components/molecules/StatCard/StatCard';
import AlertCard from '@/components/molecules/AlertCard/AlertCard';
import DateRangePicker from '@/components/molecules/DateRangePicker/DateRangePicker';
import styles from './DashboardOperaciones.module.css';

interface DashboardOperacionesProps {
  rangeStats: StatsRange | null;
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
}

export default function DashboardOperaciones({
  rangeStats,
  range,
  onRangeChange,
}: DashboardOperacionesProps) {
  const navigate = useNavigate();
  const qs = `desde=${range.from}&hasta=${range.to}`;
  const totalScans = rangeStats?.total_scans ?? 0;
  const sinComprobante = rangeStats?.sin_comprobante ?? 0;
  const duplicados = rangeStats?.duplicados ?? 0;
  const editadas = rangeStats?.transacciones_editadas ?? 0;

  return (
    <KpiSection
      title="KPIs Operativos"
      subtitle="¿Qué tan bien opera el proceso?"
      icon={<IconSettings size={20} stroke={1.5} />}
    >
      <DateRangePicker value={range} onChange={onRangeChange} />

      <div className={styles.grid}>
        <StatCard
          label="Transacciones"
          value={String(rangeStats?.cantidad ?? 0)}
          sublabel="pagos en el periodo"
        />
        <StatCard
          label="Total scans"
          value={String(totalScans)}
          sublabel="comprobantes procesados"
        />
      </div>

      <div className={styles.alertGrid}>
        <AlertCard
          title="Sin comprobante"
          value={sinComprobante}
          description="Pagos sin imagen del comprobante"
          variant={sinComprobante > 0 ? 'warning' : 'success'}
          onClick={sinComprobante > 0 ? () => navigate(`/pagos?sin_comprobante=true&${qs}`) : undefined}
        />
        <AlertCard
          title="Duplicados detectados"
          value={duplicados}
          description="Grupos de pagos con la misma referencia"
          variant={duplicados > 0 ? 'danger' : 'success'}
          onClick={duplicados > 0 ? () => navigate(`/pagos?duplicados=true&${qs}`) : undefined}
        />
        <AlertCard
          title="Transacciones editadas"
          value={editadas}
          description="Ediciones en el periodo"
          variant={editadas > 10 ? 'warning' : 'info'}
          onClick={editadas > 0 ? () => navigate(`/pagos?editados=true&${qs}`) : undefined}
        />
        {rangeStats && totalScans > 0 && (
          <AlertCard
            title="Tiempo promedio"
            value={`${(rangeStats.tiempo_promedio_ms / 1000).toFixed(1)}s`}
            description="Por comprobante"
            variant={rangeStats.tiempo_promedio_ms > 10000 ? 'warning' : 'info'}
          />
        )}
      </div>
    </KpiSection>
  );
}
