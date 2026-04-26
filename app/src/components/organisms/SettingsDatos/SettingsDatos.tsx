import { useState } from 'react';
import { format } from 'date-fns';
import { exportPagosCsv, exportPagosPdf, downloadBlob } from '@/services/export.service';
import { getDefaultDateRange } from '@/services/stats.service';
import Card from '@/components/atoms/Card/Card';
import Button from '@/components/atoms/Button/Button';
import DateRangePicker from '@/components/molecules/DateRangePicker/DateRangePicker';
import type { DateRange } from '@/types/common';
import styles from './SettingsDatos.module.css';

type Format = 'csv' | 'pdf';

export default function SettingsDatos() {
  const [range, setRange] = useState<DateRange>(getDefaultDateRange);
  const [busy, setBusy] = useState<Format | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(fmt: Format) {
    setBusy(fmt);
    setError(null);
    try {
      const blob = fmt === 'csv' ? await exportPagosCsv(range) : await exportPagosPdf(range);
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
            variant="secondary"
            onClick={() => handleExport('csv')}
            disabled={busy !== null}
          >
            {busy === 'csv' ? 'Generando CSV...' : 'Descargar CSV'}
          </Button>
          <Button
            onClick={() => handleExport('pdf')}
            disabled={busy !== null}
          >
            {busy === 'pdf' ? 'Generando PDF...' : 'Descargar PDF'}
          </Button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </Card>
    </div>
  );
}
