import { IconWifiOff } from '@tabler/icons-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import styles from './OfflineBanner.module.css';

export default function OfflineBanner() {
  const online = useNetworkStatus();
  if (online) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <IconWifiOff size={14} stroke={2} />
      <span>Sin conexión</span>
    </div>
  );
}
