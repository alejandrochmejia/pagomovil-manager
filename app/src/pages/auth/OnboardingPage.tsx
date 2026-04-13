import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import {
  IconBuilding,
  IconAlertCircle,
  IconRocket,
  IconLogout,
} from '@tabler/icons-react';
import Input from '@/components/atoms/Input/Input';
import Button from '@/components/atoms/Button/Button';
import Card from '@/components/atoms/Card/Card';
import Spinner from '@/components/atoms/Spinner/Spinner';
import styles from './Auth.module.css';

export default function OnboardingPage() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError('');
    if (!nombre.trim()) {
      setError('Ingresa el nombre de tu empresa o negocio');
      return;
    }
    setLoading(true);
    try {
      await api('/empresas', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim() }),
      });
      await refresh();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear empresa');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <div className={styles.brandHeader}>
          <div className={styles.successIcon}>
            <IconBuilding size={28} stroke={1.5} />
          </div>
          <span className={styles.brandName}>Un paso más</span>
          <span className={styles.brandSub}>
            Hola {user?.nombre || user?.email}, crea tu primera empresa para comenzar
          </span>
        </div>

        <Card className={styles.card}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <h2 className={styles.formTitle}>Tu empresa</h2>
            <p className={styles.formSubtitle}>
              Puedes crear hasta 3 empresas y cambiar entre ellas desde Ajustes
            </p>

            {error && (
              <div className={`${styles.alert} ${styles.alertError}`}>
                <IconAlertCircle size={18} stroke={1.5} className={styles.alertIcon} />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Nombre de la empresa"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Mi negocio, tienda, etc."
            />

            <Button type="submit" disabled={loading}>
              <span className={styles.btnContent}>
                {loading ? <Spinner size="sm" /> : <IconRocket size={18} stroke={1.5} />}
                {loading ? 'Creando...' : 'Crear y comenzar'}
              </span>
            </Button>

            <Button type="button" variant="danger" onClick={logout}>
              <span className={styles.btnContent}>
                <IconLogout size={16} stroke={1.5} />
                Cerrar sesión
              </span>
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
