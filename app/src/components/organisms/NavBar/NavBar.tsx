import { NavLink } from 'react-router-dom';
import styles from './NavBar.module.css';

const tabs = [
  { to: '/', label: 'Inicio', icon: '📊' },
  { to: '/pagos', label: 'Pagos', icon: '💰' },
  { to: '/scan', label: 'Escanear', icon: '📷' },
  { to: '/cuentas', label: 'Cuentas', icon: '👤' },
  { to: '/settings', label: 'Ajustes', icon: '⚙️' },
] as const;

export default function NavBar() {
  return (
    <nav className={styles.nav}>
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
