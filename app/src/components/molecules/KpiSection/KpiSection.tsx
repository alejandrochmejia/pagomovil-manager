import type { ReactNode } from 'react';
import styles from './KpiSection.module.css';

interface KpiSectionProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}

export default function KpiSection({ title, subtitle, icon, children }: KpiSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <div>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      <div className={styles.content}>{children}</div>
    </section>
  );
}
