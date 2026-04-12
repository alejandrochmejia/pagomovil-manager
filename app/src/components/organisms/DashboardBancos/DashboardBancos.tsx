import type { StatsBreakdown, DateRange } from '@/types/common';
import { IconBuildingBank } from '@tabler/icons-react';
import KpiSection from '@/components/molecules/KpiSection/KpiSection';
import BankRanking from '@/components/molecules/BankRanking/BankRanking';
import DateRangePicker from '@/components/molecules/DateRangePicker/DateRangePicker';
import Card from '@/components/atoms/Card/Card';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import styles from './DashboardBancos.module.css';

const COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2',
  '#7c3aed', '#db2777', '#ea580c', '#65a30d', '#0d9488',
];

interface DashboardBancosProps {
  breakdownBanco: StatsBreakdown[];
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  fmt: (n: number) => string;
}

export default function DashboardBancos({
  breakdownBanco,
  range,
  onRangeChange,
  fmt,
}: DashboardBancosProps) {
  const pieData = breakdownBanco.map((d) => ({ banco: d.grupo, total: d.total }));

  return (
    <KpiSection
      title="KPIs por Banco"
      subtitle="Por donde te pagan?"
      icon={<IconBuildingBank size={20} stroke={1.5} />}
    >
      <DateRangePicker value={range} onChange={onRangeChange} />

      {pieData.length > 0 && (
        <Card>
          <h3 className={styles.chartTitle}>Distribucion por banco</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
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
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => fmt(Number(value))} />
              <Legend fontSize={11} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      <BankRanking data={breakdownBanco} formatter={fmt} />
    </KpiSection>
  );
}
