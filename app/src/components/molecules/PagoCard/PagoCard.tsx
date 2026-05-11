import Card from '@/components/atoms/Card/Card';
import { formatCurrencyBs, formatCurrencyUsd, formatDate } from '@/utils/format';
import type { Pago } from '@/types/pago';
import styles from './PagoCard.module.css';

interface PagoCardProps {
  pago: Pago;
  onClick?: () => void;
  showUsd?: boolean;
  rateForDate?: number;
}

export default function PagoCard({ pago, onClick, showUsd, rateForDate }: PagoCardProps) {
  const showAsUsd = !!showUsd && !!rateForDate;
  const montoLabel = showAsUsd
    ? formatCurrencyUsd(pago.monto / rateForDate!)
    : formatCurrencyBs(pago.monto);

  return (
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
        {showUsd && !rateForDate && (
          <span className={styles.noRate}>Tasa no disponible</span>
        )}
      </div>
    </Card>
  );
}
