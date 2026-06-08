import { useState, type MouseEvent } from 'react';
import { IconPhoto } from '@tabler/icons-react';
import Card from '@/components/atoms/Card/Card';
import ImageLightbox from '@/components/atoms/ImageLightbox/ImageLightbox';
import { formatCurrencyBs, formatCurrencyUsd, formatDate } from '@/utils/format';
import type { Pago } from '@/types/pago';
import styles from './PagoCard.module.css';

interface PagoCardProps {
  pago: Pago;
  onClick?: () => void;
  showUsd?: boolean;
  rateForDate?: number;
}

function isViewableImage(uri?: string): boolean {
  if (!uri) return false;
  return uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:image/');
}

export default function PagoCard({ pago, onClick, showUsd, rateForDate }: PagoCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const showAsUsd = !!showUsd && !!rateForDate;
  const montoLabel = showAsUsd
    ? formatCurrencyUsd(pago.monto / rateForDate!)
    : formatCurrencyBs(pago.monto);

  const hasImage = isViewableImage(pago.imagen_uri);

  function handleImageClick(e: MouseEvent) {
    e.stopPropagation();
    setLightboxOpen(true);
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
        <div className={styles.bottom}>
          <span className={styles.ref}>Ref: {pago.referencia}</span>
          <div className={styles.bottomRight}>
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
