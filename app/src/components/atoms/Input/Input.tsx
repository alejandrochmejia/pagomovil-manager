import { type InputHTMLAttributes, useId } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  prefix?: string;
}

export default function Input({
  label,
  error,
  prefix,
  className = '',
  ...props
}: InputProps) {
  const id = useId();

  return (
    <div className={`${styles.field} ${className}`}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={`${styles.inputWrapper} ${error ? styles.hasError : ''}`}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input id={id} className={styles.input} {...props} />
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
