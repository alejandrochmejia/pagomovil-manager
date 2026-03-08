import { useState, useEffect } from 'react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar...',
  debounceMs = 300,
}: SearchBarProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [local, debounceMs, onChange, value]);

  return (
    <div className={styles.wrapper}>
      <span className={styles.icon}>🔍</span>
      <input
        className={styles.input}
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
      />
      {local && (
        <button
          className={styles.clear}
          onClick={() => {
            setLocal('');
            onChange('');
          }}
          aria-label="Limpiar búsqueda"
        >
          ✕
        </button>
      )}
    </div>
  );
}
