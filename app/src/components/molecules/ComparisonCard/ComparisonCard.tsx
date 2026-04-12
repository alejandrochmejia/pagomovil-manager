import Card from '@/components/atoms/Card/Card';
import TrendIndicator from '@/components/atoms/TrendIndicator/TrendIndicator';
import styles from './ComparisonCard.module.css';

interface ComparisonCardProps {
  label: string;
  value: string;
  sublabel?: string;
  current: number;
  previous: number;
  previousLabel: string;
}

export default function ComparisonCard({
  label,
  value,
  sublabel,
  current,
  previous,
  previousLabel,
}: ComparisonCardProps) {
  return (
    <Card className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
      <div className={styles.comparison}>
        <TrendIndicator current={current} previous={previous} />
        <span className={styles.vsLabel}>vs {previousLabel}</span>
      </div>
    </Card>
  );
}
