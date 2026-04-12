import type { StatsSummary, StatsBreakdown, DateRange } from '@/types/common';
import { IconCurrencyDollar } from '@tabler/icons-react';
import KpiSection from '@/components/molecules/KpiSection/KpiSection';
import ComparisonCard from '@/components/molecules/ComparisonCard/ComparisonCard';
import HourlyChart from '@/components/molecules/HourlyChart/HourlyChart';
import DateRangePicker from '@/components/molecules/DateRangePicker/DateRangePicker';
import ProgressBar from '@/components/atoms/ProgressBar/ProgressBar';
import Card from '@/components/atoms/Card/Card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import styles from './DashboardFinanzas.module.css';

interface DashboardFinanzasProps {
  summary: StatsSummary;
  breakdownDia: StatsBreakdown[];
  breakdownHora: StatsBreakdown[];
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  fmt: (n: number) => string;
  fmtShort: (n: number) => string;
}

export default function DashboardFinanzas({
  summary,
  breakdownDia,
  breakdownHora,
  range,
  onRangeChange,
  fmt,
  fmtShort,
}: DashboardFinanzasProps) {
  const metaProgress = summary.meta_mes
    ? Math.min((summary.total_mes / summary.meta_mes) * 100, 100)
    : null;

  return (
    <KpiSection
      title="KPIs Financieros"
      subtitle="Como esta el dinero?"
      icon={<IconCurrencyDollar size={20} stroke={1.5} />}
    >
      <div className={styles.comparisons}>
        <ComparisonCard
          label="Hoy"
          value={fmt(summary.total_hoy)}
          sublabel={`${summary.cantidad_hoy} pagos`}
          current={summary.total_hoy}
          previous={summary.total_ayer}
          previousLabel="ayer"
        />
        <ComparisonCard
          label="Esta semana"
          value={fmt(summary.total_semana)}
          sublabel={`${summary.cantidad_semana} pagos`}
          current={summary.total_semana}
          previous={summary.total_semana_anterior}
          previousLabel="semana ant."
        />
      </div>

      {metaProgress !== null && (
        <Card className={styles.metaCard}>
          <span className={styles.metaLabel}>
            Meta mensual: {fmt(summary.meta_mes!)}
          </span>
          <ProgressBar
            value={metaProgress}
            label={`${fmt(summary.total_mes)} de ${fmt(summary.meta_mes!)}`}
          />
        </Card>
      )}

      <DateRangePicker value={range} onChange={onRangeChange} />

      {breakdownDia.length > 0 && (
        <Card>
          <h3 className={styles.chartTitle}>Ingresos por dia</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={breakdownDia.map((d) => ({ fecha: d.grupo, total: d.total }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="fecha" tickFormatter={(v: string) => v.slice(5)} fontSize={11} />
              <YAxis fontSize={11} tickFormatter={fmtShort} />
              <Tooltip
                formatter={(value) => [fmt(Number(value)), 'Total']}
                labelFormatter={(label) => String(label)}
              />
              <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <HourlyChart data={breakdownHora} formatter={fmtShort} />
    </KpiSection>
  );
}
