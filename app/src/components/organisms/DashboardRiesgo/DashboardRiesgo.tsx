import type { StatsSummary } from '@/types/common';
import { IconShieldCheck } from '@tabler/icons-react';
import KpiSection from '@/components/molecules/KpiSection/KpiSection';
import AlertCard from '@/components/molecules/AlertCard/AlertCard';
import styles from './DashboardRiesgo.module.css';

interface DashboardRiesgoProps {
  summary: StatsSummary;
}

export default function DashboardRiesgo({ summary }: DashboardRiesgoProps) {
  return (
    <KpiSection
      title="Riesgo y Control"
      subtitle="¿Qué tan expuesto estás?"
      icon={<IconShieldCheck size={20} stroke={1.5} />}
    >
      <div className={styles.grid}>
        <AlertCard
          title="Duplicados detectados"
          value={summary.duplicados_hoy}
          description="Referencias duplicadas hoy"
          variant={summary.duplicados_hoy > 0 ? 'danger' : 'success'}
        />
        <AlertCard
          title="Pendientes revision"
          value={summary.pendientes_revision}
          description="Comprobantes sin confirmar"
          variant={summary.pendientes_revision > 0 ? 'warning' : 'success'}
        />
        <AlertCard
          title="Transacciones editadas"
          value={summary.transacciones_editadas}
          description="Ediciones este mes"
          variant={summary.transacciones_editadas > 10 ? 'warning' : 'info'}
        />
        <AlertCard
          title="Anuladas"
          value={summary.transacciones_anuladas}
          description="Anulaciones este mes"
          variant={summary.transacciones_anuladas > 5 ? 'danger' : 'info'}
        />
      </div>
    </KpiSection>
  );
}
