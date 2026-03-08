import type { ReactNode } from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'info' | 'danger';
  children: ReactNode;
}

export default function Badge({ variant = 'info', children }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[variant]}`}>{children}</span>;
}
