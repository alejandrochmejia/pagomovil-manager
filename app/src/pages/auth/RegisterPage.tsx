import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { IconAlertCircle, IconUserPlus } from '@tabler/icons-react';
import Input from '@/components/atoms/Input/Input';
import Button from '@/components/atoms/Button/Button';
import Card from '@/components/atoms/Card/Card';
import Spinner from '@/components/atoms/Spinner/Spinner';
import PasswordStrengthMeter from '@/components/molecules/PasswordStrengthMeter/PasswordStrengthMeter';
import { evaluatePassword } from '@/utils/passwordStrength';
import styles from './Auth.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = evaluatePassword(password);
  const passwordsMatch = passwordConfirm === password;
  const showConfirmError = passwordConfirm.length > 0 && !passwordsMatch;
  const canSubmit =
    !loading &&
    nombre.trim().length > 0 &&
    email.length > 0 &&
    strength.meetsRequirements &&
    passwordsMatch &&
    passwordConfirm.length > 0;

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError('');
    if (!nombre.trim()) {
      setError('Ingresa tu nombre');
      return;
    }
    if (!email) {
      setError('Ingresa tu email');
      return;
    }
    if (!strength.meetsRequirements) {
      setError('La contraseña no cumple los requisitos mínimos de seguridad');
      return;
    }
    if (!passwordsMatch) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, nombre);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
      setLoading(false);
    }
  }

  return (
    <Card className={styles.card}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.formTitle}>Crear cuenta</h2>
        <p className={styles.formSubtitle}>Regístrate para gestionar tus pagos</p>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            <IconAlertCircle size={18} stroke={1.5} className={styles.alertIcon} />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu nombre completo"
          autoComplete="name"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          autoComplete="email"
        />
        <Input
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres seguros"
          autoComplete="new-password"
        />
        <PasswordStrengthMeter password={password} />
        <Input
          label="Confirmar contraseña"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder="Repite tu contraseña"
          autoComplete="new-password"
          error={showConfirmError ? 'Las contraseñas no coinciden' : undefined}
        />

        <Button type="submit" disabled={!canSubmit}>
          <span className={styles.btnContent}>
            {loading ? <Spinner size="sm" /> : <IconUserPlus size={18} stroke={1.5} />}
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </span>
        </Button>

        <div className={styles.divider}>o</div>

        <div className={styles.links}>
          <Link to="/login" className={styles.link}>
            Ya tengo una cuenta
          </Link>
        </div>
      </form>
    </Card>
  );
}
