import { useState } from 'react';
import { format } from 'date-fns';
import {
  exportPagosCsv,
  exportPagosPdf,
  exportPagosJson,
  downloadBlob,
} from '@/services/export.service';
import { getDefaultDateRange } from '@/services/stats.service';
import Card from '@/components/atoms/Card/Card';
import Button from '@/components/atoms/Button/Button';
import DateRangePicker from '@/components/molecules/DateRangePicker/DateRangePicker';
import type { DateRange } from '@/types/common';
import styles from './SettingsDatos.module.css';

type Format = 'csv' | 'pdf' | 'json';

const exporters: Record<Format, (r?: DateRange, s?: string) => Promise<Blob>> = {
  csv: exportPagosCsv,
  pdf: exportPagosPdf,
  json: exportPagosJson,
};

export default function SettingsDatos() {
  const [range, setRange] = useState<DateRange>(getDefaultDateRange);
  const [busy, setBusy] = useState<Format | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(fmt: Format) {
    setBusy(fmt);
    setError(null);
    try {
      const blob = await exporters[fmt](range);
      const stamp = format(new Date(), 'yyyy-MM-dd-HHmm');
      downloadBlob(blob, `pagos-${stamp}.${fmt}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.container}>
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>Exportar pagos</h3>
        <p className={styles.help}>
          Selecciona el rango de fechas y descarga los pagos en el formato que prefieras.
        </p>

        <DateRangePicker value={range} onChange={setRange} />

        <div className={styles.actions}>
          <Button
            onClick={() => handleExport('pdf')}
            disabled={busy !== null}
          >
            {busy === 'pdf' ? 'Generando PDF...' : 'Descargar PDF'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleExport('csv')}
            disabled={busy !== null}
          >
            {busy === 'csv' ? 'Generando CSV...' : 'Descargar CSV'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleExport('json')}
            disabled={busy !== null}
          >
            {busy === 'json' ? 'Generando JSON...' : 'Descargar JSON'}
          </Button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </Card>
    </div>
  );
}
