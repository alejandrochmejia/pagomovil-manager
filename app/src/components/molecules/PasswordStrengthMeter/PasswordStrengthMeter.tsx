import type { ReactNode } from 'react';
import { IconCheck, IconCircleDashed } from '@tabler/icons-react';
import { evaluatePassword } from '@/utils/passwordStrength';
import styles from './PasswordStrengthMeter.module.css';

interface Props {
  password: string;
}

export default function PasswordStrengthMeter({ password }: Props) {
  if (!password) return null;

  const evaluation = evaluatePassword(password);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.track}>
          <div
            className={`${styles.fill} ${styles[evaluation.level]}`}
            style={{ width: `${evaluation.score}%` }}
          />
        </div>
        <span className={`${styles.label} ${styles[evaluation.level]}`}>
          {evaluation.label}
        </span>
      </div>
      <ul className={styles.checks}>
        <Check ok={evaluation.checks.length}>Mínimo 8 caracteres</Check>
        <Check ok={evaluation.checks.lower && evaluation.checks.upper}>
          Mayúsculas y minúsculas
        </Check>
        <Check ok={evaluation.checks.number}>Al menos un número</Check>
        <Check ok={evaluation.checks.symbol}>Al menos un símbolo</Check>
      </ul>
    </div>
  );
}

function Check({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className={`${styles.check} ${ok ? styles.checkOk : ''}`}>
      {ok ? (
        <IconCheck size={14} stroke={2.5} />
      ) : (
        <IconCircleDashed size={14} stroke={2} />
      )}
      <span>{children}</span>
    </li>
  );
}
