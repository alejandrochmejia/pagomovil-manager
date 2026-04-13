import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '@/services/auth.service';
import { IconAlertCircle, IconMail, IconMailCheck, IconArrowLeft } from '@tabler/icons-react';
import Input from '@/components/atoms/Input/Input';
import Button from '@/components/atoms/Button/Button';
import Card from '@/components/atoms/Card/Card';
import Spinner from '@/components/atoms/Spinner/Spinner';
import styles from './Auth.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError('');
    if (!email) {
      setError('Ingresa tu email');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el email');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className={styles.card}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <IconMailCheck size={32} stroke={1.5} />
          </div>
          <h2 className={styles.successTitle}>Email enviado</h2>
          <p className={styles.successDesc}>
            Enviamos un enlace de recuperación a <strong>{email}</strong>. Revisa tu bandeja de entrada y carpeta de spam.
          </p>
          <Link to="/login" className={styles.link}>
            <span className={styles.btnContent}>
              <IconArrowLeft size={16} stroke={1.5} />
              Volver al login
            </span>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.card}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.formTitle}>Recuperar contraseña</h2>
        <p className={styles.formSubtitle}>Te enviaremos un enlace para restablecer tu contraseña</p>

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

        <Button type="submit" disabled={loading}>
          <span className={styles.btnContent}>
            {loading ? <Spinner size="sm" /> : <IconMail size={18} stroke={1.5} />}
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </span>
        </Button>

        <div className={styles.links}>
          <Link to="/login" className={styles.link}>
            <span className={styles.btnContent}>
              <IconArrowLeft size={14} stroke={1.5} />
              Volver al login
            </span>
          </Link>
        </div>
      </form>
    </Card>
  );
}
