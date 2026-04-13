import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { IconCreditCardPay } from '@tabler/icons-react';
import Spinner from '@/components/atoms/Spinner/Spinner';
import styles from './ProtectedRoute.module.css';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, empresas, loading } = useAuth();

  if (loading) {
    return (
      <div className={styles.splash}>
        <div className={styles.splashIcon}>
          <IconCreditCardPay size={32} stroke={1.5} />
        </div>
        <Spinner size="md" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (empresas.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
