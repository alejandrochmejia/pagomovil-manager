import { format, startOfMonth, startOfWeek, endOfMonth, subMonths } from 'date-fns';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import type { DateRange } from '@/types/common';
import styles from './DateRangePicker.module.css';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const HISTORIC_FROM = '2000-01-01';

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
  {
    label: 'Mes pasado',
    get: (): DateRange => {
      const prev = subMonths(new Date(), 1);
      return {
        from: format(startOfMonth(prev), 'yyyy-MM-dd'),
        to: format(endOfMonth(prev), 'yyyy-MM-dd'),
      };
    },
  },
  {
    label: 'Historico',
    get: (): DateRange => ({
      from: HISTORIC_FROM,
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
];

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const rangoInvalido = !!value.from && !!value.to && value.to < value.from;

  // No propagar un rango invalido (evita disparar fetches con desde > hasta).
  const emit = (next: DateRange) => {
    if (next.from && next.to && next.to < next.from) return;
    onChange(next);
  };

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
          max={value.to || undefined}
          onChange={(e) => emit({ ...value, from: e.target.value })}
        />
        <Input
          label="Hasta"
          type="date"
          value={value.to}
          min={value.from || undefined}
          error={rangoInvalido ? 'La fecha "Hasta" no puede ser anterior a "Desde"' : undefined}
          onChange={(e) => emit({ ...value, to: e.target.value })}
        />
      </div>
    </div>
  );
}
