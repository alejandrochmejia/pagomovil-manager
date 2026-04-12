import { useState, useRef, type ChangeEvent } from 'react';
import {
  buildExportData,
  exportToJson,
  downloadJson,
  parseImportData,
  isImportOlder,
  applyImport,
} from '@/services/export.service';
import { useTheme } from '@/hooks/useTheme';
import { format } from 'date-fns';
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';
import Button from '@/components/atoms/Button/Button';
import Card from '@/components/atoms/Card/Card';
import ConfirmDialog from '@/components/molecules/ConfirmDialog/ConfirmDialog';
import type { ExportData } from '@/types/common';
import styles from './SettingsPage.module.css';

const themeOptions = [
  { value: 'light' as const, label: 'Claro', icon: IconSun },
  { value: 'dark' as const, label: 'Oscuro', icon: IconMoon },
  { value: 'system' as const, label: 'Sistema', icon: IconDeviceDesktop },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [importResult, setImportResult] = useState('');
  const [pendingImport, setPendingImport] = useState<ExportData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    const data = await buildExportData();
    const json = exportToJson(data);
    const filename = `pagomovil-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    downloadJson(json, filename);
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = parseImportData(reader.result as string);

        if (isImportOlder(data)) {
          setPendingImport(data);
        } else {
          const result = await applyImport(data, 'merge');
          setImportResult(
            `Importados: ${result.pagosImported} pagos, ${result.cuentasImported} cuentas`,
          );
        }
      } catch (err) {
        setImportResult(err instanceof Error ? err.message : 'Error al importar');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleConfirmImport() {
    if (!pendingImport) return;
    const result = await applyImport(pendingImport, 'merge');
    setImportResult(
      `Importados: ${result.pagosImported} pagos, ${result.cuentasImported} cuentas`,
    );
    setPendingImport(null);
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
          <Button variant="secondary" onClick={handleExport}>
            Exportar datos
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Importar datos
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className={styles.hiddenInput}
          />
        </div>
        {importResult && (
          <p className={styles.importResult}>{importResult}</p>
        )}
      </Card>

      <ConfirmDialog
        isOpen={!!pendingImport}
        onClose={() => setPendingImport(null)}
        onConfirm={handleConfirmImport}
        title="Archivo más antiguo"
        message="El archivo que intentas importar tiene una fecha de exportación anterior a la última importación. ¿Deseas continuar?"
        confirmLabel="Importar de todos modos"
        confirmVariant="primary"
      />
    </div>
  );
}
