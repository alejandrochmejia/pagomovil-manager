import type { ReactNode } from 'react';
import styles from './SectionTabs.module.css';

interface Tab {
  key: string;
  label: string;
  icon?: ReactNode;
}

interface SectionTabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export default function SectionTabs({ tabs, active, onChange }: SectionTabsProps) {
  return (
    <div className={styles.strip}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`${styles.tab} ${active === tab.key ? styles.active : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.icon && <span className={styles.icon}>{tab.icon}</span>}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
