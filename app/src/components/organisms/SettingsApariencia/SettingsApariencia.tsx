import { useTheme } from '@/hooks/useTheme';
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';
import Card from '@/components/atoms/Card/Card';
import styles from './SettingsApariencia.module.css';

const themeOptions = [
  { value: 'light' as const, label: 'Claro', icon: IconSun },
  { value: 'dark' as const, label: 'Oscuro', icon: IconMoon },
  { value: 'system' as const, label: 'Sistema', icon: IconDeviceDesktop },
];

export default function SettingsApariencia() {
  const { theme, setTheme } = useTheme();

  return (
    <div className={styles.container}>
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>Tema</h3>
        <div className={styles.themeSwitch}>
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.themeOption} ${theme === opt.value ? styles.themeActive : ''}`}
              onClick={() => setTheme(opt.value)}
              aria-label={opt.label}
            >
              <opt.icon size={18} stroke={1.5} />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
