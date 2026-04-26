import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { exportPagosCsv, downloadBlob } from '@/services/export.service';
import { format } from 'date-fns';
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';
import Card from '@/components/atoms/Card/Card';
import Button from '@/components/atoms/Button/Button';
import styles from './SettingsApariencia.module.css';

const themeOptions = [
  { value: 'light' as const, label: 'Claro', icon: IconSun },
  { value: 'dark' as const, label: 'Oscuro', icon: IconMoon },
  { value: 'system' as const, label: 'Sistema', icon: IconDeviceDesktop },
];

export default function SettingsApariencia() {
  const { theme, setTheme } = useTheme();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportPagosCsv();
      const filename = `pagos-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
      downloadBlob(blob, filename);
    } finally {
      setExporting(false);
    }
  }

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
        <h3 className={styles.sectionTitle}>Datos</h3>
        <Button variant="secondary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exportando...' : 'Exportar pagos (CSV)'}
        </Button>
      </Card>
    </div>
  );
}
