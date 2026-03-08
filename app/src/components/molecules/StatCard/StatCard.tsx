import Card from '@/components/atoms/Card/Card';
import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
}

export default function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <Card className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
    </Card>
  );
}
