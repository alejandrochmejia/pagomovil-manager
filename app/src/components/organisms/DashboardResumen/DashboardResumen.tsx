import { useMemo } from 'react';
import { parse, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { StatsSummary, StatsExtra, StatsMonthly } from '@/types/common';
import type { BcvRate } from '@/services/bcv.service';
import BcvRateBar from '@/components/molecules/BcvRateBar/BcvRateBar';
import StatCard from '@/components/molecules/StatCard/StatCard';
import Card from '@/components/atoms/Card/Card';
import styles from './DashboardResumen.module.css';

interface DashboardResumenProps {
  summary: StatsSummary;
  extra: StatsExtra | null;
  monthly: StatsMonthly[];
  rate: BcvRate | null;
  rateLoading: boolean;
  rateError: string;
  onRefreshRate: () => void;
  fmt: (n: number) => string;
  fmtShort: (n: number) => string;
}

export default function DashboardResumen({
  summary,
  extra,
  monthly,
  rate,
  rateLoading,
  rateError,
  onRefreshRate,
  fmt,
  fmtShort,
}: DashboardResumenProps) {
  const ticketPromedio = extra?.ticket_promedio_historico ?? summary.promedio_ticket;

  const chartData = useMemo(
    () =>
      monthly.map((m) => ({
        mes: format(parse(m.mes, 'yyyy-MM', new Date()), 'MMM', { locale: es }),
        mesFull: format(parse(m.mes, 'yyyy-MM', new Date()), "MMMM yyyy", { locale: es }),
        total: m.total,
      })),
    [monthly],
  );

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
          label="Mes pasado"
          value={fmt(extra?.total_mes_anterior ?? 0)}
          sublabel={`${extra?.cantidad_mes_anterior ?? 0} pagos`}
        />
        <StatCard
          label="Ticket promedio"
          value={fmt(ticketPromedio)}
          sublabel="historico"
        />
      </div>

      {chartData.length > 0 && (
        <Card>
          <h3 className={styles.chartTitle}>Ingresos últimos 12 meses</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="mes" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={fmtShort} />
              <Tooltip
                formatter={(value) => [fmt(Number(value)), 'Total']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.mesFull ?? ''}
              />
              <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
