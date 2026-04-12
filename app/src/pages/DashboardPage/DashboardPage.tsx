import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { getDashboardStats, getDefaultDateRange } from '@/services/stats.service';
import { useBcvRate } from '@/hooks/useBcvRate';
import { formatCurrencyBs, formatCurrencyUsd, formatCurrency } from '@/utils/format';
import type { DateRange, DashboardStats } from '@/types/common';
import { IconArrowsExchange } from '@tabler/icons-react';
import BcvRateBar from '@/components/molecules/BcvRateBar/BcvRateBar';
import StatCard from '@/components/molecules/StatCard/StatCard';
import DateRangePicker from '@/components/molecules/DateRangePicker/DateRangePicker';
import Spinner from '@/components/atoms/Spinner/Spinner';
import Card from '@/components/atoms/Card/Card';
import type { PieLabelRenderProps } from 'recharts';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import styles from './DashboardPage.module.css';

const COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2',
  '#7c3aed', '#db2777', '#ea580c', '#65a30d', '#0d9488',
];

export default function DashboardPage() {
  const [range, setRange] = useState<DateRange>(getDefaultDateRange);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [showUsd, setShowUsd] = useState(false);
  const { rate, loading: rateLoading, error: rateError, refresh: refreshRate } = useBcvRate();

  const pagosCount = useLiveQuery(() => db.pagos.count());

  useEffect(() => {
    getDashboardStats(range).then(setStats);
  }, [range, pagosCount]);

  const fmt = useCallback(
    (bs: number) => {
      if (showUsd && rate) return formatCurrencyUsd(bs / rate.promedio);
      return formatCurrencyBs(bs);
    },
    [showUsd, rate],
  );

  const fmtShort = useCallback(
    (bs: number) => {
      if (showUsd && rate) return formatCurrency(bs / rate.promedio);
      return formatCurrency(bs);
    },
    [showUsd, rate],
  );

  const canToggle = !!rate;

  if (!stats) {
    return (
      <div className="page">
        <h1>Dashboard</h1>
        <div className={styles.loading}><Spinner /></div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Dashboard</h1>

      <BcvRateBar
        rate={rate}
        loading={rateLoading}
        error={rateError}
        onRefresh={refreshRate}
      />

      <div className={styles.currencyHeader}>
        <span className={styles.currencyLabel}>
          Montos en {showUsd ? 'USD' : 'Bs.'}
        </span>
        {canToggle && (
          <button
            className={styles.toggleBtn}
            onClick={() => setShowUsd((v) => !v)}
            aria-label="Cambiar moneda"
          >
            <IconArrowsExchange size={16} stroke={1.5} />
            <span>{showUsd ? 'Ver en Bs.' : 'Ver en USD'}</span>
          </button>
        )}
      </div>

      <div className={styles.statsGrid}>
        <StatCard
          label="Hoy"
          value={fmt(stats.totalHoy)}
          sublabel={`${stats.cantidadHoy} pagos`}
        />
        <StatCard
          label="Este mes"
          value={fmt(stats.totalMes)}
          sublabel={`${stats.cantidadMes} pagos`}
        />
        <StatCard
          label="Promedio"
          value={fmt(stats.promedioMes)}
          sublabel="por pago este mes"
        />
      </div>

      <DateRangePicker value={range} onChange={setRange} />

      {stats.pagosPorDia.length > 0 && (
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Ingresos por día</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.pagosPorDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="fecha"
                tickFormatter={(v: string) => v.slice(5)}
                fontSize={11}
              />
              <YAxis fontSize={11} tickFormatter={(v: number) => fmtShort(v)} />
              <Tooltip
                formatter={(value) => [fmt(Number(value)), 'Total']}
                labelFormatter={(label) => String(label)}
              />
              <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {stats.pagosPorBanco.length > 0 && (
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Pagos por banco</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stats.pagosPorBanco}
                dataKey="total"
                nameKey="banco"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(props: PieLabelRenderProps & { banco?: string }) => {
                  const banco = String(props.banco ?? '');
                  const percent = Number(props.percent ?? 0);
                  return `${banco.slice(0, 10)} ${(percent * 100).toFixed(0)}%`;
                }}
                labelLine={false}
                fontSize={10}
              >
                {stats.pagosPorBanco.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => fmt(Number(value))} />
              <Legend fontSize={11} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
