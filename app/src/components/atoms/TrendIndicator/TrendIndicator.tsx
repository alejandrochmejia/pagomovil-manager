import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';
import styles from './TrendIndicator.module.css';

interface TrendIndicatorProps {
  current: number;
  previous: number;
  format?: (n: number) => string;
}

export default function TrendIndicator({ current, previous, format }: TrendIndicatorProps) {
  if (previous === 0 && current === 0) {
    return (
      <span className={`${styles.trend} ${styles.neutral}`}>
        <IconMinus size={14} stroke={2} />
        <span>Sin cambios</span>
      </span>
    );
  }

  const diff = current - previous;
  const pct = previous !== 0 ? (diff / previous) * 100 : current > 0 ? 100 : 0;
  const isUp = diff > 0;
  const isNeutral = diff === 0;

  const variant = isNeutral ? styles.neutral : isUp ? styles.up : styles.down;
  const Icon = isNeutral ? IconMinus : isUp ? IconTrendingUp : IconTrendingDown;
  const label = format ? format(Math.abs(diff)) : `${Math.abs(pct).toFixed(0)}%`;

  return (
    <span className={`${styles.trend} ${variant}`}>
      <Icon size={14} stroke={2} />
      <span>{label}</span>
    </span>
  );
}
