import Card from '@/components/atoms/Card/Card';
import { formatCurrencyBs, formatDate } from '@/utils/format';
import type { Pago } from '@/types/pago';
import styles from './PagoCard.module.css';

interface PagoCardProps {
  pago: Pago;
  onClick?: () => void;
}

export default function PagoCard({ pago, onClick }: PagoCardProps) {
  return (
    <Card className={styles.card} onClick={onClick}>
      <div className={styles.top}>
        <span className={styles.monto}>{formatCurrencyBs(pago.monto)}</span>
        <span className={styles.fecha}>{formatDate(pago.fecha)}</span>
      </div>
      <div className={styles.details}>
        <span className={styles.banco}>{pago.banco}</span>
        <span className={styles.separator}>·</span>
        <span className={styles.cedula}>{pago.cedula}</span>
      </div>
      <div className={styles.ref}>Ref: {pago.referencia}</div>
    </Card>
  );
}
