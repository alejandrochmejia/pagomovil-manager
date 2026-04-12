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
import type { StatsBreakdown } from '@/types/common';
import styles from './HourlyChart.module.css';

interface HourlyChartProps {
  data: StatsBreakdown[];
  formatter: (n: number) => string;
}

export default function HourlyChart({ data, formatter }: HourlyChartProps) {
  const filtered = data.filter((d) => d.grupo !== 'N/A');
  if (filtered.length === 0) return null;

  const chartData = filtered.map((d) => ({
    hora: `${d.grupo}h`,
    total: d.total,
    cantidad: d.cantidad,
  }));

  const peak = filtered.reduce((max, d) => (d.total > max.total ? d : max), filtered[0]);

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Ingresos por hora</h3>
        <span className={styles.peak}>Pico: {peak.grupo}:00h</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="hora" fontSize={10} />
          <YAxis fontSize={10} tickFormatter={formatter} />
          <Tooltip formatter={(value) => [formatter(Number(value)), 'Total']} />
          <Bar dataKey="total" fill="var(--color-info)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
