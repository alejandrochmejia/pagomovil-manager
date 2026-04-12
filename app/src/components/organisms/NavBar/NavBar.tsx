import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  IconChartBar,
  IconCoin,
  IconCamera,
  IconUser,
  IconSettings,
} from '@tabler/icons-react';
import { useRouteIndex } from '@/hooks/useRouteIndex';
import NavIndicator from '@/components/atoms/NavIndicator/NavIndicator';
import styles from './NavBar.module.css';

const tabs: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Inicio', icon: <IconChartBar size={22} stroke={1.5} /> },
  { to: '/pagos', label: 'Pagos', icon: <IconCoin size={22} stroke={1.5} /> },
  { to: '/scan', label: 'Escanear', icon: <IconCamera size={22} stroke={1.5} /> },
  { to: '/cuentas', label: 'Cuentas', icon: <IconUser size={22} stroke={1.5} /> },
  { to: '/settings', label: 'Ajustes', icon: <IconSettings size={22} stroke={1.5} /> },
];

export default function NavBar() {
  const { index } = useRouteIndex();

  return (
    <nav className={styles.nav}>
      <NavIndicator index={index} total={tabs.length} />
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ''}`
          }
        >
          <span className={styles.icon}>{tab.icon}</span>
          <span className={styles.label}>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
