import { useAuth } from '@/hooks/useAuth';
import { IconLogout } from '@tabler/icons-react';
import Card from '@/components/atoms/Card/Card';
import Button from '@/components/atoms/Button/Button';
import styles from './SettingsPerfil.module.css';

export default function SettingsPerfil() {
  const { user, logout } = useAuth();

  return (
    <div className={styles.container}>
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>Mi perfil</h3>
        <div className={styles.field}>
          <span className={styles.label}>Email</span>
          <span className={styles.value}>{user?.email}</span>
        </div>
      </Card>

      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>Sesion</h3>
        <Button variant="danger" onClick={logout}>
          <IconLogout size={16} stroke={1.5} />
          Cerrar sesion
        </Button>
      </Card>
    </div>
  );
}
