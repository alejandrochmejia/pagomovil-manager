import { IconAlertTriangle, IconX } from '@tabler/icons-react';
import styles from './ErrorBanner.module.css';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

/** Banner de error para acciones (borrar, cambiar estado, etc.) que fallan. */
export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div className={styles.banner} role="alert">
      <IconAlertTriangle size={18} stroke={1.8} className={styles.icon} />
      <span className={styles.text}>{message}</span>
      {onDismiss && (
        <button type="button" className={styles.close} onClick={onDismiss} aria-label="Cerrar aviso">
          <IconX size={16} stroke={2} />
        </button>
      )}
    </div>
  );
}
