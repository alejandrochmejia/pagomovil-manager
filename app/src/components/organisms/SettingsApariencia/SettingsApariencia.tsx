import { useTheme } from '@/hooks/useTheme';
import { useFontSize } from '@/hooks/useFontSize';
import { IconSun, IconMoon, IconDeviceDesktop, IconLetterA } from '@tabler/icons-react';
import Card from '@/components/atoms/Card/Card';
import styles from './SettingsApariencia.module.css';

const themeOptions = [
  { value: 'light' as const, label: 'Claro', icon: IconSun },
  { value: 'dark' as const, label: 'Oscuro', icon: IconMoon },
  { value: 'system' as const, label: 'Sistema', icon: IconDeviceDesktop },
];

const fontSizeOptions = [
  { value: 'small' as const, label: 'Pequeño', iconSize: 14 },
  { value: 'medium' as const, label: 'Mediano', iconSize: 18 },
  { value: 'large' as const, label: 'Grande', iconSize: 22 },
];

export default function SettingsApariencia() {
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize } = useFontSize();

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

      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>Tamaño de fuente</h3>
        <div className={styles.themeSwitch}>
          {fontSizeOptions.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.themeOption} ${fontSize === opt.value ? styles.themeActive : ''}`}
              onClick={() => setFontSize(opt.value)}
              aria-label={opt.label}
            >
              <IconLetterA size={opt.iconSize} stroke={1.5} />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
