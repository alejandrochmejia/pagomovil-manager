import { useState, type MouseEvent } from 'react';
import { IconPhoto, IconTrash, IconBuildingBank } from '@tabler/icons-react';
import Card from '@/components/atoms/Card/Card';
import Badge from '@/components/atoms/Badge/Badge';
import ImageLightbox from '@/components/atoms/ImageLightbox/ImageLightbox';
import { formatCurrencyBs, formatCurrencyUsd, formatDate } from '@/utils/format';
import {
  ESTADO_LABELS,
  ESTADO_BADGE_VARIANT,
  ESTADOS_SELECCIONABLES,
  type EstadoPago,
} from '@/utils/constants';
import type { Pago } from '@/types/pago';
import styles from './PagoCard.module.css';

interface PagoCardProps {
  pago: Pago;
  onClick?: () => void;
  onDelete?: () => void;
  onChangeEstado?: (nuevo: EstadoPago) => void | Promise<void>;
  showUsd?: boolean;
  rateForDate?: number;
  cuentaNombre?: string;
}

function isViewableImage(uri?: string): boolean {
  if (!uri) return false;
  return uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:image/');
}

export default function PagoCard({
  pago,
  onClick,
  onDelete,
  onChangeEstado,
  showUsd,
  rateForDate,
  cuentaNombre,
}: PagoCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [estadoMenuOpen, setEstadoMenuOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const showAsUsd = !!showUsd && !!rateForDate;
  const montoLabel = showAsUsd
    ? formatCurrencyUsd(pago.monto / rateForDate!)
    : formatCurrencyBs(pago.monto);

  const hasImage = isViewableImage(pago.imagen_uri);
  const estadoActual = (pago.estado as EstadoPago | undefined) ?? 'confirmado';

  function handleImageClick(e: MouseEvent) {
    e.stopPropagation();
    setLightboxOpen(true);
  }

  function handleDeleteClick(e: MouseEvent) {
    e.stopPropagation();
    onDelete?.();
  }

  function handleEstadoClick(e: MouseEvent) {
    e.stopPropagation();
    if (!onChangeEstado) return;
    setEstadoMenuOpen((v) => !v);
  }

  async function handlePickEstado(e: MouseEvent, nuevo: EstadoPago) {
    e.stopPropagation();
    setEstadoMenuOpen(false);
    if (nuevo === estadoActual || !onChangeEstado) return;
    setChanging(true);
    try {
      await onChangeEstado(nuevo);
    } finally {
      setChanging(false);
    }
  }

  return (
    <>
      <Card className={styles.card} onClick={onClick}>
        <div className={styles.top}>
          <span className={styles.monto}>{montoLabel}</span>
          <span className={styles.fecha}>{formatDate(pago.fecha)}</span>
        </div>
        <div className={styles.details}>
          <span className={styles.banco}>{pago.banco}</span>
          <span className={styles.separator}>·</span>
          <span className={styles.cedula}>{pago.cedula}</span>
        </div>
        {cuentaNombre && (
          <div className={styles.cuenta}>
            <IconBuildingBank size={13} stroke={1.8} />
            <span>{cuentaNombre}</span>
          </div>
        )}
        <div className={styles.bottom}>
          <span className={styles.ref}>Ref: {pago.referencia}</span>
          <div className={styles.bottomRight}>
            <div className={styles.estadoWrap}>
              <button
                type="button"
                className={`${styles.estadoBtn} ${onChangeEstado ? styles.estadoClickable : ''}`}
                onClick={handleEstadoClick}
                disabled={!onChangeEstado || changing}
                aria-label={onChangeEstado ? 'Cambiar estado' : `Estado: ${ESTADO_LABELS[estadoActual]}`}
              >
                <Badge variant={ESTADO_BADGE_VARIANT[estadoActual]}>
                  {ESTADO_LABELS[estadoActual]}
                </Badge>
              </button>
              {estadoMenuOpen && onChangeEstado && (
                <div className={styles.estadoMenu}>
                  {ESTADOS_SELECCIONABLES.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`${styles.estadoOpt} ${opt === estadoActual ? styles.estadoOptActive : ''}`}
                      onClick={(e) => handlePickEstado(e, opt)}
                    >
                      {ESTADO_LABELS[opt]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {showUsd && !rateForDate && (
              <span className={styles.noRate}>Tasa no disponible</span>
            )}
            {hasImage && (
              <button
                type="button"
                className={styles.imageBtn}
                onClick={handleImageClick}
                aria-label="Ver comprobante"
              >
                <IconPhoto size={16} stroke={1.8} />
                <span>Comprobante</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={handleDeleteClick}
                aria-label="Eliminar pago"
              >
                <IconTrash size={16} stroke={1.8} />
              </button>
            )}
          </div>
        </div>
      </Card>
      {hasImage && (
        <ImageLightbox
          src={pago.imagen_uri!}
          alt={`Comprobante ref ${pago.referencia}`}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
