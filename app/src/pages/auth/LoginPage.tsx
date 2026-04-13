import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { IconAlertCircle, IconLogin } from '@tabler/icons-react';
import Input from '@/components/atoms/Input/Input';
import Button from '@/components/atoms/Button/Button';
import Card from '@/components/atoms/Card/Card';
import Spinner from '@/components/atoms/Spinner/Spinner';
import styles from './Auth.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Completa todos los campos');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={styles.card}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.formTitle}>Iniciar sesion</h2>
        <p className={styles.formSubtitle}>Ingresa a tu cuenta para continuar</p>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            <IconAlertCircle size={18} stroke={1.5} className={styles.alertIcon} />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          autoComplete="email"
        />
        <Input
          label="Contrasena"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Tu contrasena"
          autoComplete="current-password"
        />

        <Button type="submit" disabled={loading}>
          <span className={styles.btnContent}>
            {loading ? <Spinner size="sm" /> : <IconLogin size={18} stroke={1.5} />}
            {loading ? 'Ingresando...' : 'Ingresar'}
          </span>
        </Button>

        <Link to="/forgot-password" className={styles.link}>
          Olvide mi contrasena
        </Link>

        <div className={styles.divider}>o</div>

        <div className={styles.links}>
          <Link to="/register" className={styles.link}>
            Crear una cuenta nueva
          </Link>
        </div>
      </form>
    </Card>
  );
}
