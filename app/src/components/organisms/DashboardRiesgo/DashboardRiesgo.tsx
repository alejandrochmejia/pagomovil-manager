import type { StatsSummary } from '@/types/common';
import { useNavigate } from 'react-router-dom';
import { IconShieldCheck } from '@tabler/icons-react';
import KpiSection from '@/components/molecules/KpiSection/KpiSection';
import AlertCard from '@/components/molecules/AlertCard/AlertCard';
import styles from './DashboardRiesgo.module.css';

interface DashboardRiesgoProps {
  summary: StatsSummary;
}

export default function DashboardRiesgo({ summary }: DashboardRiesgoProps) {
  const navigate = useNavigate();
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
          description="Grupos de pagos con la misma referencia"
          variant={summary.duplicados_hoy > 0 ? 'danger' : 'success'}
          onClick={summary.duplicados_hoy > 0 ? () => navigate('/pagos?duplicados=true') : undefined}
        />
        <AlertCard
          title="Pendientes revision"
          value={summary.pendientes_revision}
          description="Comprobantes sin confirmar"
          variant={summary.pendientes_revision > 0 ? 'warning' : 'success'}
          onClick={summary.pendientes_revision > 0 ? () => navigate('/pagos?estado=pendiente') : undefined}
        />
        <AlertCard
          title="Transacciones editadas"
          value={summary.transacciones_editadas}
          description="Ediciones este mes"
          variant={summary.transacciones_editadas > 10 ? 'warning' : 'info'}
          onClick={summary.transacciones_editadas > 0 ? () => navigate('/pagos?editados=true') : undefined}
        />
        <AlertCard
          title="Anuladas"
          value={summary.transacciones_anuladas}
          description="Anulaciones este mes"
          variant={summary.transacciones_anuladas > 5 ? 'danger' : 'info'}
          onClick={summary.transacciones_anuladas > 0 ? () => navigate('/pagos?estado=anulado') : undefined}
        />
      </div>
    </KpiSection>
  );
}
