import Card from '@/components/atoms/Card/Card';
import styles from './AlertCard.module.css';

interface AlertCardProps {
  title: string;
  value: string | number;
  description: string;
  variant: 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
}

const variantStyles: Record<string, string> = {
  success: styles.success,
  warning: styles.warning,
  danger: styles.danger,
  info: styles.info,
};

export default function AlertCard({ title, value, description, variant, onClick }: AlertCardProps) {
  const className = `${styles.card} ${variantStyles[variant] ?? ''} ${onClick ? styles.clickable : ''}`;
  return (
    <Card className={className} onClick={onClick}>
      <span className={styles.value}>{value}</span>
      <span className={styles.title}>{title}</span>
      <span className={styles.description}>{description}</span>
    </Card>
  );
}
