import { useMemo, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  IconChartBar,
  IconCoin,
  IconCamera,
  IconUser,
  IconSettings,
} from '@tabler/icons-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouteIndex } from '@/hooks/useRouteIndex';
import NavIndicator from '@/components/atoms/NavIndicator/NavIndicator';
import styles from './NavBar.module.css';

interface Tab {
  to: string;
  label: string;
  icon: ReactNode;
  visible: boolean;
}

export default function NavBar() {
  const perms = usePermissions();

  const allTabs: Tab[] = useMemo(() => [
    { to: '/', label: 'Inicio', icon: <IconChartBar size={22} stroke={1.5} />, visible: true },
    { to: '/pagos', label: 'Pagos', icon: <IconCoin size={22} stroke={1.5} />, visible: true },
    { to: '/scan', label: 'Escanear', icon: <IconCamera size={22} stroke={1.5} />, visible: perms.canScan },
    { to: '/cuentas', label: 'Cuentas', icon: <IconUser size={22} stroke={1.5} />, visible: perms.canManageCuentas },
    { to: '/settings', label: 'Ajustes', icon: <IconSettings size={22} stroke={1.5} />, visible: true },
  ], [perms.canScan, perms.canManageCuentas]);

  const visibleTabs = useMemo(() => allTabs.filter((t) => t.visible), [allTabs]);
  const routes = useMemo(() => visibleTabs.map((t) => t.to), [visibleTabs]);
  const { index } = useRouteIndex(routes);

  return (
    <nav className={styles.nav}>
      <NavIndicator index={index} total={visibleTabs.length} />
      {visibleTabs.map((tab) => (
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
