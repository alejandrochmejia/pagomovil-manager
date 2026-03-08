import Card from '@/components/atoms/Card/Card';
import Badge from '@/components/atoms/Badge/Badge';
import Button from '@/components/atoms/Button/Button';
import type { CuentaReceptora } from '@/types/pago';
import styles from './CuentaCard.module.css';

interface CuentaCardProps {
  cuenta: CuentaReceptora;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CuentaCard({ cuenta, onEdit, onDelete }: CuentaCardProps) {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <span className={styles.nombre}>{cuenta.nombre}</span>
        <Badge variant={cuenta.activa ? 'success' : 'warning'}>
          {cuenta.activa ? 'Activa' : 'Inactiva'}
        </Badge>
      </div>
      <div className={styles.details}>
        <div className={styles.row}>
          <span className={styles.label}>Banco</span>
          <span>{cuenta.banco}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Cédula</span>
          <span>{cuenta.cedula}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Teléfono</span>
          <span>{cuenta.telefono}</span>
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Editar
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          Eliminar
        </Button>
      </div>
    </Card>
  );
}
