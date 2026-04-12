import { useState, useEffect, type FormEvent } from 'react';
import { IconZoomIn } from '@tabler/icons-react';
import type { ScanResponse } from '@/types/common';
import type { Pago, CuentaReceptora } from '@/types/pago';
import { formatCurrencyBs, toISODate } from '@/utils/format';
import { getAllCuentas } from '@/services/cuenta.service';
import ImageLightbox from '@/components/atoms/ImageLightbox/ImageLightbox';
import Input from '@/components/atoms/Input/Input';
import Select from '@/components/atoms/Select/Select';
import Button from '@/components/atoms/Button/Button';
import styles from './ScanPreview.module.css';

interface ScanPreviewProps {
  imageBase64: string;
  scanResult: ScanResponse;
  onConfirm: (data: Omit<Pago, 'id' | 'creado_en' | 'actualizado_en'>) => void;
  onCancel: () => void;
}

export default function ScanPreview({
  imageBase64,
  scanResult,
  onConfirm,
  onCancel,
}: ScanPreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [monto, setMonto] = useState(scanResult.monto?.toString() ?? '');
  const [referencia, setReferencia] = useState(scanResult.referencia ?? '');
  const [fecha, setFecha] = useState(scanResult.fecha ?? toISODate(new Date()));
  const [hora, setHora] = useState(scanResult.hora ?? '');
  const [concepto, setConcepto] = useState(scanResult.concepto ?? '');
  const [cuentaId, setCuentaId] = useState('');
  const [cuentas, setCuentas] = useState<CuentaReceptora[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getAllCuentas().then(setCuentas);
  }, []);

  const hasComision = !!scanResult.comision && scanResult.comision > 0;
  const imageSrc = `data:image/jpeg;base64,${imageBase64}`;

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    const montoNum = Number(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) e.monto = 'Monto invalido';
    if (!referencia.trim()) e.referencia = 'Referencia requerida';
    if (!fecha) e.fecha = 'Fecha requerida';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    onConfirm({
      monto: montoNum,
      banco: scanResult.banco ?? '',
      cedula: scanResult.cedula ?? '',
      telefono: scanResult.telefono ?? undefined,
      referencia,
      fecha,
      hora: hora || undefined,
      concepto: concepto || undefined,
      cuenta_receptora_id: cuentaId ? Number(cuentaId) : undefined,
    });
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.imageWrapper}
        onClick={() => setLightboxOpen(true)}
        aria-label="Ver comprobante"
      >
        <img src={imageSrc} alt="Comprobante escaneado" className={styles.image} />
        <span className={styles.zoomBadge}>
          <IconZoomIn size={16} stroke={2} />
          <span>Ver imagen</span>
        </span>
      </button>

      <ImageLightbox
        src={imageSrc}
        alt="Comprobante escaneado"
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {hasComision && (
        <div className={styles.comisionInfo}>
          <div className={styles.comisionRow}>
            <span>Monto total debitado</span>
            <span>{formatCurrencyBs(scanResult.montoTotal ?? 0)}</span>
          </div>
          <div className={styles.comisionRow}>
            <span>Comision del banco</span>
            <span className={styles.comisionAmount}>
              - {formatCurrencyBs(scanResult.comision!)}
            </span>
          </div>
          <div className={`${styles.comisionRow} ${styles.comisionNet}`}>
            <span>Monto a registrar</span>
            <span>{formatCurrencyBs(scanResult.monto ?? 0)}</span>
          </div>
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <h3 className={styles.title}>Verifica los datos</h3>
        <Input
          label="Monto (sin comision)"
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          error={errors.monto}
          prefix="Bs."
          inputMode="decimal"
          step="0.01"
        />
        <Input
          label="Referencia"
          value={referencia}
          onChange={(e) => setReferencia(e.target.value.replace(/\D/g, ''))}
          error={errors.referencia}
          inputMode="numeric"
        />
        <div className={styles.dateRow}>
          <Input
            label="Fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            error={errors.fecha}
          />
          <Input
            label="Hora"
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />
        </div>
        {cuentas.length > 0 && (
          <Select
            label="Cuenta receptora (opcional)"
            options={cuentas.map((c) => ({
              value: String(c.id),
              label: `${c.nombre} - ${c.banco}`,
            }))}
            value={cuentaId}
            onChange={(e) => setCuentaId(e.target.value)}
            placeholder="Sin cuenta asociada"
          />
        )}
        <Input
          label="Concepto (opcional)"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          placeholder="Descripcion del pago"
        />
        <div className={styles.actions}>
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar pago</Button>
        </div>
      </form>
    </div>
  );
}
