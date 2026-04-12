import { type ReactNode, useRef, useEffect, useState } from 'react';
import styles from './PageTransition.module.css';

interface PageTransitionProps {
  routeKey: string;
  direction: 'left' | 'right' | 'none';
  children: ReactNode;
}

export default function PageTransition({ routeKey, direction, children }: PageTransitionProps) {
  const [animClass, setAnimClass] = useState('');
  const prevKey = useRef(routeKey);

  useEffect(() => {
    if (prevKey.current === routeKey) return;
    prevKey.current = routeKey;

    if (direction === 'none') return;

    const cls = direction === 'right' ? styles.slideFromRight : styles.slideFromLeft;
    setAnimClass(cls);

    const id = setTimeout(() => setAnimClass(''), 300);
    return () => clearTimeout(id);
  }, [routeKey, direction]);

  return (
    <div className={`${styles.wrapper} ${animClass}`}>
      {children}
    </div>
  );
}
