import { useState } from 'react';
import { IconAlertTriangle, IconPhoto } from '@tabler/icons-react';
import Badge from '@/components/atoms/Badge/Badge';
import Button from '@/components/atoms/Button/Button';
import ImageLightbox from '@/components/atoms/ImageLightbox/ImageLightbox';
import { formatCurrencyBs, formatCurrencyUsd, formatDate } from '@/utils/format';
import { ESTADO_LABELS, ESTADO_BADGE_VARIANT, type EstadoPago } from '@/utils/constants';
import type { Pago } from '@/types/pago';
import styles from './PagoDetail.module.css';

interface PagoDetailProps {
  pago: Pago;
  canEdit: boolean;
  canResolve: boolean;
  onEdit?: () => void;
  onResolve?: () => void | Promise<void>;
  rateForDate?: number;
}

function isViewableImage(uri?: string): boolean {
  if (!uri) return false;
  return uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:image/');
}

export default function PagoDetail({
  pago,
  canEdit,
  canResolve,
  onEdit,
  onResolve,
  rateForDate,
}: PagoDetailProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const hasImage = isViewableImage(pago.imagen_uri);
  const estado = (pago.estado as EstadoPago | undefined) ?? 'confirmado';
  const noCoincide = !!pago.comprobante_no_coincidente;

  async function handleResolve() {
    if (!onResolve) return;
    setResolving(true);
    try {
      await onResolve();
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className={styles.container}>
      {noCoincide && (
        <div className={styles.alert}>
          <IconAlertTriangle size={18} stroke={1.8} />
          <span>El comprobante no coincide con los datos registrados de este pago.</span>
        </div>
      )}

      <div className={styles.montoRow}>
        <span className={styles.monto}>{formatCurrencyBs(pago.monto)}</span>
        {rateForDate ? (
          <span className={styles.montoUsd}>{formatCurrencyUsd(pago.monto / rateForDate)}</span>
        ) : null}
        <Badge variant={ESTADO_BADGE_VARIANT[estado]}>{ESTADO_LABELS[estado]}</Badge>
      </div>

      <dl className={styles.fields}>
        <Field label="Banco" value={pago.banco} />
        <Field label="Cédula" value={pago.cedula} />
        {pago.telefono && <Field label="Teléfono" value={pago.telefono} />}
        <Field label="Referencia" value={pago.referencia} />
        <Field label="Fecha" value={formatDate(pago.fecha)} />
        {pago.hora && <Field label="Hora" value={pago.hora} />}
        {pago.concepto && <Field label="Concepto" value={pago.concepto} />}
      </dl>

      <div className={styles.comprobante}>
        <span className={styles.comprobanteLabel}>Comprobante</span>
        {hasImage ? (
          <button
            type="button"
            className={styles.imageBtn}
            onClick={() => setLightboxOpen(true)}
            aria-label="Ver comprobante"
          >
            <IconPhoto size={16} stroke={1.8} />
            <span>Ver comprobante</span>
          </button>
        ) : (
          <span className={styles.sinComprobante}>Sin comprobante adjunto</span>
        )}
      </div>

      <div className={styles.actions}>
        {noCoincide && canResolve && (
          <Button variant="secondary" onClick={handleResolve} disabled={resolving}>
            {resolving ? 'Procesando...' : 'Marcar como revisado'}
          </Button>
        )}
        {canEdit && onEdit && <Button onClick={onEdit}>Editar</Button>}
      </div>

      {hasImage && (
        <ImageLightbox
          src={pago.imagen_uri!}
          alt={`Comprobante ref ${pago.referencia}`}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.field}>
      <dt className={styles.fieldLabel}>{label}</dt>
      <dd className={styles.fieldValue}>{value}</dd>
    </div>
  );
}
