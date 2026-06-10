import type { StatsBreakdown, DateRange } from '@/types/common';
import { IconBuildingBank, IconCalendarOff } from '@tabler/icons-react';
import KpiSection from '@/components/molecules/KpiSection/KpiSection';
import AccountRanking from '@/components/molecules/AccountRanking/AccountRanking';
import DateRangePicker from '@/components/molecules/DateRangePicker/DateRangePicker';
import Card from '@/components/atoms/Card/Card';
import EmptyState from '@/components/atoms/EmptyState/EmptyState';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import styles from './DashboardCuentas.module.css';

const COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2',
  '#7c3aed', '#db2777', '#ea580c', '#65a30d', '#0d9488',
];

interface DashboardCuentasProps {
  breakdownCuenta: StatsBreakdown[];
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  fmt: (n: number) => string;
}

export default function DashboardCuentas({
  breakdownCuenta,
  range,
  onRangeChange,
  fmt,
}: DashboardCuentasProps) {
  const pieData = breakdownCuenta.map((d) => ({ cuenta: d.grupo, total: d.total }));

  return (
    <KpiSection
      title="Cuentas receptoras"
      subtitle="¿En qué cuentas recibes?"
      icon={<IconBuildingBank size={20} stroke={1.5} />}
    >
      <DateRangePicker value={range} onChange={onRangeChange} />

      {breakdownCuenta.length === 0 ? (
        <EmptyState
          icon={<IconCalendarOff size={40} stroke={1.5} />}
          title="Sin transacciones"
          description="No hay pagos en el periodo seleccionado"
        />
      ) : (
        <>
          <Card>
            <h3 className={styles.chartTitle}>Distribución por cuenta</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="total"
                  nameKey="cuenta"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(props: PieLabelRenderProps & { cuenta?: string }) => {
                    const cuenta = String(props.cuenta ?? '');
                    const percent = Number(props.percent ?? 0);
                    return `${cuenta.slice(0, 10)} ${(percent * 100).toFixed(0)}%`;
                  }}
                  labelLine={false}
                  fontSize={10}
                >
                  {pieData.map((d, i) => (
                    <Cell key={d.cuenta} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => fmt(Number(value))} />
                <Legend fontSize={11} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <AccountRanking data={breakdownCuenta} formatter={fmt} />
        </>
      )}
    </KpiSection>
  );
}
