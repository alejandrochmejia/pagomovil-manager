import { format, startOfMonth, startOfWeek, endOfMonth } from 'date-fns';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import type { DateRange } from '@/types/common';
import styles from './DateRangePicker.module.css';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const presets = [
  {
    label: 'Hoy',
    get: (): DateRange => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return { from: today, to: today };
    },
  },
  {
    label: 'Esta semana',
    get: (): DateRange => ({
      from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'Este mes',
    get: (): DateRange => ({
      from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    }),
  },
];

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className={styles.container}>
      <div className={styles.presets}>
        {presets.map((p) => (
          <Button key={p.label} variant="ghost" size="sm" onClick={() => onChange(p.get())}>
            {p.label}
          </Button>
        ))}
      </div>
      <div className={styles.inputs}>
        <Input
          label="Desde"
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
        <Input
          label="Hasta"
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </div>
    </div>
  );
}
