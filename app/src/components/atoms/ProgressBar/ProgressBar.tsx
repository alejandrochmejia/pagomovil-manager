import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number;
  label?: string;
}

export default function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div className={styles.container}>
      {label && (
        <div className={styles.header}>
          <span className={styles.label}>{label}</span>
          <span className={styles.pct}>{clamped.toFixed(0)}%</span>
        </div>
      )}
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
