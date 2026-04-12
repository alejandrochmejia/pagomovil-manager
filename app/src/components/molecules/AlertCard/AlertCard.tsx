import Card from '@/components/atoms/Card/Card';
import styles from './AlertCard.module.css';

interface AlertCardProps {
  title: string;
  value: string | number;
  description: string;
  variant: 'success' | 'warning' | 'danger' | 'info';
}

const variantStyles: Record<string, string> = {
  success: styles.success,
  warning: styles.warning,
  danger: styles.danger,
  info: styles.info,
};

export default function AlertCard({ title, value, description, variant }: AlertCardProps) {
  return (
    <Card className={`${styles.card} ${variantStyles[variant] ?? ''}`}>
      <span className={styles.value}>{value}</span>
      <span className={styles.title}>{title}</span>
      <span className={styles.description}>{description}</span>
    </Card>
  );
}
