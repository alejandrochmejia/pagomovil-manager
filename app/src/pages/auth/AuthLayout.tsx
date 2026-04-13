import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { IconCreditCardPay } from '@tabler/icons-react';
import Spinner from '@/components/atoms/Spinner/Spinner';
import styles from './Auth.module.css';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className={styles.center}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <div className={styles.brandHeader}>
          <div className={styles.brandIcon}>
            <IconCreditCardPay size={28} stroke={1.5} />
          </div>
          <span className={styles.brandName}>Pago Móvil Manager</span>
          <span className={styles.brandSub}>Gestiona tus pagos móviles</span>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
