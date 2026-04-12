import { useState } from 'react';
import {
  buildExportData,
  exportToJson,
  downloadJson,
} from '@/services/export.service';
import { useTheme } from '@/hooks/useTheme';
import { format } from 'date-fns';
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';
import Button from '@/components/atoms/Button/Button';
import Card from '@/components/atoms/Card/Card';
import styles from './SettingsPage.module.css';

const themeOptions = [
  { value: 'light' as const, label: 'Claro', icon: IconSun },
  { value: 'dark' as const, label: 'Oscuro', icon: IconMoon },
  { value: 'system' as const, label: 'Sistema', icon: IconDeviceDesktop },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const data = await buildExportData();
      const json = exportToJson(data);
      const filename = `pagomovil-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      downloadJson(json, filename);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="page">
      <h1>Ajustes</h1>

      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>Apariencia</h3>
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
        <div className={styles.dataActions}>
          <Button variant="secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exportando...' : 'Exportar datos'}
          </Button>
        </div>
        <p className={styles.hint}>
          Descarga todos los pagos y cuentas en formato JSON
        </p>
      </Card>
    </div>
  );
}
