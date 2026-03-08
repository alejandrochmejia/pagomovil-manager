import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { getDashboardStats, getDefaultDateRange } from '@/services/stats.service';
import { formatCurrencyBs, formatCurrency } from '@/utils/format';
import type { DateRange, DashboardStats } from '@/types/common';
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

  const pagosCount = useLiveQuery(() => db.pagos.count());

  useEffect(() => {
    getDashboardStats(range).then(setStats);
  }, [range, pagosCount]);

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

      <div className={styles.statsGrid}>
        <StatCard
          label="Hoy"
          value={formatCurrencyBs(stats.totalHoy)}
          sublabel={`${stats.cantidadHoy} pagos`}
        />
        <StatCard
          label="Este mes"
          value={formatCurrencyBs(stats.totalMes)}
          sublabel={`${stats.cantidadMes} pagos`}
        />
        <StatCard
          label="Promedio"
          value={formatCurrencyBs(stats.promedioMes)}
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
              <YAxis fontSize={11} tickFormatter={(v: number) => formatCurrency(v)} />
              <Tooltip
                formatter={(value) => [formatCurrencyBs(Number(value)), 'Total']}
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
              <Tooltip formatter={(value) => formatCurrencyBs(Number(value))} />
              <Legend fontSize={11} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
